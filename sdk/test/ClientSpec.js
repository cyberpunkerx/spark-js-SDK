describe('Client', function() {
    'use strict';

    var ASC, xhr, requests, fakeGuestToken, fakeAccessToken;
    var testGuestUrl, testAccessUrl, testRefreshUrl, testApiUrl, testRedirectURI,testClientId;


    before(function() {
        ASC = ADSKSpark.Client;
        testGuestUrl = 'http://localhost/guest';
        testAccessUrl = 'http://localhost/access';
        testRefreshUrl = 'http://localhost/refresh';
        testApiUrl = 'https://localhost';
        testRedirectURI = 'https://localhost/callbackURI';
        testClientId = 'this is not an ID';

        fakeGuestToken = {
            access_token: 'this is a fake guest token',
            expires_in: 10000,
            issued_at: Date.now()
        };

        fakeAccessToken = {
            access_token: 'this is a fake access token',
            expires_in: 10000,
            issued_at: Date.now(),
            refresh_token: 'this is a fake refresh token',
            refresh_token_expires_in: 100000,
            refresh_token_issued_at: Date.now()
        };

        ASC.initialize(testClientId, testGuestUrl, testAccessUrl, testRefreshUrl, testApiUrl,testRedirectURI);

    });

    beforeEach(function() {
        localStorage.clear(); // Clear any tokens that were stored by the client

        xhr = sinon.useFakeXMLHttpRequest();
        requests = [];
        xhr.onCreate = function(request) {
            requests.push(request);
        };
    });

    afterEach(function() {
        xhr.restore();
    });

    it('should exist', function() {
        Should.exist(ASC);

        ASC.should.be.Object.with.properties(
            [
                'initialize',
                'getGuestToken',
                'getLoginRedirectUrl',
                'completeLogin',
                'logout',
                'isAccessTokenValid',
                'getAccessTokenObject',
                'getAccessToken',
                'authorizedApiRequest',
                'authorizedAsGuestApiRequest',
                'openLoginWindow'
            ]
        );
    });

    //@todo: Complete these tests to work with the new Client.js and Request.js
    /*
    it('should get guest token', function() {
        requests.length.should.equal(0);

        var promise = ASC.getGuestToken();

        promise.should.be.instanceOf(Promise);

        // Make sure a request was sent
        requests.length.should.equal(1);
        var xhr = requests[0];
        xhr.url.should.equal(testGuestUrl);
        xhr.method.should.equal('GET');

        // Respond with fake token
        xhr.respond(200, {'Content-Type': 'application/json'}, JSON.stringify(fakeGuestToken));

        // Check promise
        return promise.then(function(data) {
            var guestToken = data;

            Should.exist(guestToken);
            fakeGuestToken.access_token.should.equal(guestToken);

            // Should be able to get the same token again without a request being sent
            var secondPromise = ASC.getGuestToken();

            requests.length.should.equal(1);

            return secondPromise.then(function(data) {
                guestToken.should.equal(data);
            });
        });
    });

    it('should get access token', function() {
        requests.length.should.equal(0);

        // We shouldn't already have a token
        Should(ASC.getAccessToken()).equal(null);
        ASC.isAccessTokenValid().should.equal(false);

        var promise = ASC.completeLogin('ACODE');
        promise.should.be.instanceOf(Promise);

        // Make sure the request was sent
        requests.length.should.equal(1);
        var xhr = requests[0];
        xhr.url.should.equal(testAccessUrl + '?code=ACODE&redirect_uri=' + encodeURIComponent(testRedirectURI));
        xhr.method.should.equal('GET');

        // Respond with fake token
        xhr.respond(200, {'Content-Type': 'application/json'}, JSON.stringify(fakeAccessToken));

        // Check promise
        return promise.then(function(data) {
            var accessToken = data;

            Should.exist(accessToken);
            fakeAccessToken.access_token.should.equal(accessToken);
            accessToken.should.equal(ASC.getAccessToken());

            // We should now have a valid token
            ASC.isAccessTokenValid().should.equal(true);

            ASC.logout();
            ASC.isAccessTokenValid().should.equal(false);
        });
    });

    it('should refresh access token', function() {
        requests.length.should.equal(0);

        var getAccessTokenSuccessMock = sinon.stub(ASC,'getAccessTokenObject').returns({
            refresh_token: 'AREFRESHTOKEN'
        });

        var promise = ASC.refreshAccessToken();
        promise.should.be.instanceOf(Promise);

        // Make sure the request was sent
        requests.length.should.equal(1);
        var xhr = requests[0];
        xhr.url.should.equal(testRefreshUrl + '?refresh_token=AREFRESHTOKEN');
        xhr.method.should.equal('GET');

        // Respond with fake token
        xhr.respond(200, {'Content-Type': 'application/json'}, JSON.stringify(fakeAccessToken));

        // Check promise
        return promise.then(function(data) {
            var accessToken = data.access_token;

            Should.exist(accessToken);
            fakeAccessToken.access_token.should.equal(accessToken);
            accessToken.should.equal(ASC.getAccessToken());

            // We should now have a valid token
            ASC.isAccessTokenValid().should.equal(true);

            ASC.logout();
            ASC.isAccessTokenValid().should.equal(false);
            getAccessTokenSuccessMock.restore();
        });
    });

    it('should reject a refresh access token request when access token is empty', function() {
        requests.length.should.equal(0);

        var getAccessTokenFailureMock = sinon.stub(ASC,'getAccessTokenObject').returns(null);

        var promise = ASC.refreshAccessToken();
        promise.should.be.instanceOf(Promise);

        // Make sure no request was sent
        requests.length.should.equal(0);

		// Check promise
		return promise
			.then(function (data) {
			})
			.catch(function (error) {
				expect(error).to.be.an.instanceof(Object);
				expect(error).to.have.property('message');
				getAccessTokenFailureMock.restore();
			});
	});
	*/
});
