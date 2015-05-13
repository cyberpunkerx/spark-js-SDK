var ADSKSpark = ADSKSpark || {};

(function() {
    var Client = ADSKSpark.Client = {};
    var Helpers = ADSKSpark.Helpers;

    var GUEST_TOKEN_KEY = 'spark-guest-token';
    var ACCESS_TOKEN_KEY = 'spark-access-token';

    var _clientId = '';
    var _apiUrl = '';
    var _guestTokenUrl = '';
    var _accessTokenUrl = '';
    var _refreshTokenUrl = '';
    var _accessToken = '';
    var _guestToken = '';

    /**
     * Gets an access_token and stores it in localStorage, afterwards returns a promise that resolves to the guest token.
     *
     * @returns {Promise} - A promise that resolves to the guest token.
     */
    var getGuestTokenFromServer = function() {
        return ADSKSpark.Request(_guestTokenUrl).get().then(function(data) {
            var now = Date.now();
            data.expires_at = now + parseInt(data.expires_in) * 1000;
            localStorage.setItem(GUEST_TOKEN_KEY, JSON.stringify(data));
            return data.access_token;
        });
    };



    /**** PUBLI METHODS ****/

    /**
     * Initializes the client.
     *
     * @param {String} clientId - The app key provided when you registered your app.
     * @param {String} guestTokenUrl - The URL of your authentication server used for guest tokens. This server should
     *                                 handle exchanging the client secret for a guest token.
     * @param {String} accessTokenUrl - The URL of your authentication server used for access tokens. This server should
     *                                 handle exchanging a provided code for an access token.
     * @param {String} refreshTokenUrl - The URL of your authentication server used to refresh access tokens. This server
     *                                  should call the refresh token api (extend the expiary time) and return a new valid
     *                                  access token.
     * @param {String} apiUrl - The URL of the spark api. (Ex. https://sandbox.spark.autodesk.com/api/vi)
     */
    Client.initialize = function(clientId, guestTokenUrl, accessTokenUrl, refreshTokenUrl, apiUrl) {
        _clientId = clientId;
        _guestTokenUrl = guestTokenUrl;
        _accessTokenUrl = accessTokenUrl;
        _refreshTokenUrl = refreshTokenUrl;
        _apiUrl = apiUrl;
    };

    /**
     * Returns the URL to redirect to for logging in.
     *
     * @returns {String} - The URL.
     */
    Client.getLoginRedirectUrl = function() {
        return _apiUrl + '/oauth/authorize' +
            "?response_type=code" +
            "&client_id=" + _clientId;
    };

    /**
     * Clears access token that have been stored, implements localStorage
     */
    Client.logout = function() {
        localStorage.removeItem(ACCESS_TOKEN_KEY);
    };

    /**
     * Completes the login process, gets an access_token and stores it in localStorage.
     *
     * @param {String} code - The code that was returned after the user signed in. {@see ADSKSpark.Client#login}
     * @returns {Promise} - A promise that resolves to the access token.
     */
    Client.completeLogin = function(code) {
        return ADSKSpark.Request(_accessTokenUrl).get(undefined, {code: code}).then(function(data) {
            if (data && data.expires_in && data.access_token) {
                var now = Date.now();
                data.expires_at = now + parseInt(data.expires_in) * 1000;
                localStorage.setItem(ACCESS_TOKEN_KEY, JSON.stringify(data));

                return data.access_token;
            }

            return Promise.reject(new Error(data));
        });
    };

    /**
     * Checks if the access token exists and has not expired.
     *
     * @returns {Boolean} - True if the access token exists and has not expired. Otherwise, false.
     */
    Client.isAccessTokenValid = function() {
        var accessToken = JSON.parse(localStorage.getItem(ACCESS_TOKEN_KEY));
        var now = Date.now();

        return !!(accessToken && accessToken.expires_at && accessToken.expires_at > now);
    };

    /**
     * Returns the full access token object if one is currently in local storage. Null otherwise.
     *
     * @returns {?String} - The access token or null if not found.
     */
    Client.getAccessTokenObject = function() {
        var accessToken = JSON.parse(localStorage.getItem(ACCESS_TOKEN_KEY));

        return (accessToken && accessToken.access_token) ? accessToken : null;
    };

    /**
     * Returns the access_token if one is currently in local storage. Null otherwise.
     *
     * @returns {?String} - The access token or null if not found.
     */
    Client.getAccessToken = function() {
        var accessToken = JSON.parse(localStorage.getItem(ACCESS_TOKEN_KEY));

        return (accessToken && accessToken.access_token) ? accessToken.access_token : null;
    };

    /**
     * Return a promise that resolves to the guest token.
     * This will attempt to retrieve the token from local storage. If it's missing, a call will be made to
     * the authentication server.
     *
     * @returns {Promise} - A promise that resolves to the guest token.
     */
    Client.getGuestToken = function() {
        var guestToken = JSON.parse(localStorage.getItem(GUEST_TOKEN_KEY));
        var now = Date.now();
        if (guestToken && guestToken.expires_at && guestToken.expires_at > now) {
            return Promise.resolve(guestToken.access_token);
        }

        return getGuestTokenFromServer();
    };


    /**
     * Refreshes the access token to extend it's expiary and returns a promise that resolves to the access token object
     *
     * @returns {Promise} - A promise that resolves to the access token object.
     */
    Client.refreshAccessToken = function () {
        var accessTokenObj = Client.getAccessTokenObject();

        if (accessTokenObj) {
            var refreshToken = accessTokenObj.refresh_token;
            return ADSKSpark.Request(_refreshTokenUrl)
                .get(null,{refresh_token:refreshToken})
                .then(function (data) {
                    var now = Date.now();
                    data.expires_at = now + parseInt(data.expires_in) * 1000;
                    localStorage.setItem(ACCESS_TOKEN_KEY, JSON.stringify(data));
                    return data;
                });
        }else{
            return Promise.reject(new Error('Access token does not exist, you need to login again'));
        }
    };

    /**
     * Request the API with an access token (if exists)
     * @param endpoint - The API endpoint to query
     *
     * @returns {ADSKSpark.Request} - The request object that abstracts REST APIs
     */
    Client.authorizedApiRequest = function(endpoint) {
        var authorization;

        _accessToken = Client.getAccessToken();

        if( _accessToken ) {
            authorization = 'Bearer ' + _accessToken;
        }

        return ADSKSpark.Request(_apiUrl + endpoint, authorization);
    };

    /**
     * Request the API with a guest token (if exists)
     * @param endpoint
     * @returns {ADSKSpark.Request} - The request object that abstracts REST APIs
     */
    Client.authorizedAsGuestApiRequest = function(endpoint) {
        var authorization;

        return Client.getGuestToken().then(function(guestToken) {
            _guestToken = guestToken;

            if (_guestToken) {
                authorization = 'Bearer ' + _guestToken;
            }

            return ADSKSpark.Request(_apiUrl + endpoint, authorization);
        });
    };

    /**
     * Open an auth window
     */
    Client.openLoginWindow = function(){
        Helpers.popupWindow(Client.getLoginRedirectUrl(),350,600);
    };
}());
