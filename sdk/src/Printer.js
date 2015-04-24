var ADSKSpark = ADSKSpark || {};

(function () {
    var Client = ADSKSpark.Client;

    /**
     * A paginated array of printers.
     * @param {Object} data - JSON data.
     * @constructor
     */
    ADSKSpark.Printers = function (data) {
        ADSKSpark.Paginated.call(this, data);
    };

    ADSKSpark.Printers.prototype = Object.create(ADSKSpark.Paginated.prototype);
    ADSKSpark.Printers.prototype.constructor = ADSKSpark.Printers;

    /**
     * Get printers registered to a member.
     * @param {Object} params - limit/offset/sort/filter options.
     * @returns {Promise} - A promise that will resolve to an array of printers.
     */
    ADSKSpark.Printers.get = function (params) {
        return Client.authorizedApiRequest('/print/printers')
            .get(params)
            .then(function (data) {
                return new ADSKSpark.Printers(data);
            });
    };

    ADSKSpark.Printers.prototype._parse = function (data) {
        ADSKSpark.Paginated.prototype._parse.apply(this, data);

        var printers = data.printers;
        if (Array.isArray(printers)) {
            var that = this;
            printers.forEach(function (printer) {
                that.push(new ADSKSpark.Printer(printer));
            });
        }
    };

    /**
     * A paginated array of members registered for a printer.
     * @param {Object} data - JSON data.
     * @constructor
     */
    ADSKSpark.PrinterMembers = function (data) {
        ADSKSpark.Paginated.call(this, data);
    };

    ADSKSpark.PrinterMembers.prototype = Object.create(ADSKSpark.Paginated.prototype);
    ADSKSpark.PrinterMembers.prototype.constructor = ADSKSpark.PrinterMembers;

    ADSKSpark.PrinterMembers.prototype._parse = function (data) {
        ADSKSpark.Paginated.prototype._parse.apply(this, data);

        var members = data.members;
        if (Array.isArray(members)) {
            var that = this;
            members.forEach(function (member) {
                that.push(member);
            });
        }
    };

    /**
     * A printer.
     * @param {Object} data - JSON data.
     * @constructor
     */
    ADSKSpark.Printer = function (data) {
        this.id = data.printer_id;
        this.name = data.printer_name;
        this.firmware = data.firmware;
        this.type_id = data.type_id;
        this.is_primary = data.is_primary;
        this.data = data;
        this.status = null;
    };

    /**
     * Register a printer to a member.
     * @param {String} code - Printer registration code.
     * @param {String} name - Printer nickname.
     * @returns {Promise}
     */
    ADSKSpark.Printer.register = function (code, name) {
        return Client.authorizedApiRequest('/print/printers/register')
            .post(null, {registration_code: code, printer_name: name});

        // TODO: when api is fixed, this should resolve to new printer
        // TODO: until then, we could always call getById()?
        //  .then(function (data) {
        //      return new ADSKSpark.Printer(data);
        //  });
    };

    /**
     * Get a registered printer.
     * @param {String} id - Printer id.
     * @returns {Promise} - A Promise that will resolve to a printer.
     */
    ADSKSpark.Printer.getById = function (id) {
        return Client.authorizedApiRequest('/print/printers/' + id)
            .get()
            .then(function (data) {
                return new ADSKSpark.Printer(data);
            });
    };

    ADSKSpark.Printer.prototype = {

        constructor: ADSKSpark.Printer,

        /**
         * Check printer status.
         * @returns {Promise} - A Promise that will resolve to the status information.
         */
        getStatus: function () {
            var that = this;
            return Client.authorizedApiRequest('/print/printers/' + this.id)
                .get()
                .then(function (data) {
                    that.status = data;
                    return data;
                })
                .catch(function (error) {
                    that.status = null;
                });
        },

        /**
         * Return true if the printer is online.
         * This uses the result of the last call to getStatus().
         * @returns {boolean}
         */
        isOnline: function () {
            return this.status || this.data.printer_last_health !== 'Offline';
        },

        /**
         * Return true if the printer is printing.
         * This uses the result of the last call to getStatus().
         * @returns {boolean}
         */
        isPrinting: function () {
            var state = (((this.status || {}).last_reported_state || {}).data || {}).state;
            return /^(?:Exposing|Printing|Printing Layer|Separating)$/.test(state);
        },

        /**
         * Pause a running print job.
         * @param {ADSKSpark.Job|String} job - Job or job id.
         * @returns {Promise}
         */
        pause: function (job) {
            var job_id = (job instanceof ADSKSpark.Job) ? job.id : job;
            return this.sendCommand('pause', {job_id: job_id});
        },

        /**
         * Resume a paused print job.
         * @param {ADSKSpark.Job|String} job - Job or job id.
         * @returns {Promise}
         */
        resume: function (job) {
            var job_id = (job instanceof ADSKSpark.Job) ? job.id : job;
            return this.sendCommand('resume', {job_id: job_id});
        },

        /**
         * Cancel a running print job.
         * @param {ADSKSpark.Job|String} job - Job or job id.
         * @returns {Promise}
         */
        cancel: function (job) {
            var job_id = (job instanceof ADSKSpark.Job) ? job.id : job;
            return this.sendCommand('cancel', {job_id: job_id});
        },

        /**
         * Reboot the printer.
         * @returns {Promise}
         */
        reset: function () {
            return this.sendCommand('reset');
        },

        /**
         * Run a printer specific calibration routine.
         * @returns {Promise}
         */
        calibrate: function () {
            return this.sendCommand('calibrate');
        },

        /**
         * Update the printer firmware.
         * @param {String} package_url
         * @returns {Promise}
         */
        firmwareUpgrade: function (package_url) {
            return this.sendCommand('firmware_upgrade', {package_url: package_url});
        },

        /**
         * Printer returns a public URL to the uploaded logs.
         * @returns {Promise}
         */
        log: function () {
            return this.sendCommand('log');
        },

        /**
         * Moves all actuators to their home configuration.
         * @returns {Promise}
         */
        home: function () {
            return this.sendCommand('home');
        },

        /**
         * Moves all actuators to their park configuration.
         * @returns {Promise}
         */
        park: function () {
            return this.sendCommand('park');
        },

        /**
         * Send a command to the printer and wait for it to finish.
         * @param {String} command
         * @param {String} params
         * @param {Object} options
         * @returns {Promise} - A Promise that will resolve to the command status.
         */
        sendCommandAndWait: function (command, params, options) {
            this.sendCommand(command, params)
                .then(function (commandResponse) {
                    return this.waitForCommand(commandResponse.command, commandResponse.task_id, options);
                })
                .then(function (commandStatus) {
                     return commandStatus;
                });
        },

        /**
         * Send a command to the printer.
         * @param {String} command
         * @param {String} [params]
         * @returns {Promise} - A Promise that will resolve to the command and task_id.
         */
        sendCommand: function (command, params) {
            return Client.authorizedApiRequest('/print/printers/' + this.id + '/' + command)
                .post(params)
                .then(function (data) {
                    return {command: command, task_id: data.task_id};
                });
        },

        /**
         * Wait for a printer command to finish.
         * @param {String} command
         * @param {String} task_id
         * @param {Object} options
         * @returns {Promise} - A Promise that will resolve to the command status.
         */
        waitForCommand: function (command, task_id, options) {
            options = options || {};

            var freq = options.freq || 1000, // 1 sec
                timeout = options.timeout || 10000, // 10 sec
                start = +new Date(),
                url = '/print/printers/' + this.id + '/' + command,
                params = {task_id: task_id};

            return new Promise(function (resolve, reject) {
                var timerId = setInterval(function () {
                    Client.authorizedApiRequest(url)
                        .get(params)
                        .then(function (data) {
                            var is_error = ((data || {}).data || {}).is_error;
                            if (is_error) {
                                clearInterval(timerId);
                                reject(new Error(data.error_message));

                            } else {
                                if (options.onProgress) {
                                    options.onProgress(data);
                                }

                                if (data && 1.0 <= data.progress) {
                                    clearInterval(timerId);
                                    resolve(data);

                                } else {
                                    var now = +new Date();
                                    if (timeout <= (now - start)) {
                                        clearInterval(timerId);
                                        reject(new Error('timeout'));
                                    }
                                }
                            }
                        })
                        .catch(function (error) {
                            clearInterval(timerId);
                            reject(error);
                        });
                }, freq);
            });
        },

        /**
         * Set printer member role.
         * @param {String} secondary_member_id
         * @param {boolean} is_printer_scoped - true if the member is allowed to send general commands to the printer.
         * @param {boolean} is_job_scoped - true if the member is allowed to send jobs to the printer.
         * @returns {Promise}
         */
        setMemberRole: function (secondary_member_id, is_printer_scoped, is_job_scoped) {
            if (this.is_primary) {
                return Client.authorizedApiRequest('/print/printers/' + this.id + '/member_role')
                    .post({
                        secondary_member_id: secondary_member_id,
                        is_printer_scoped: is_printer_scoped,
                        is_job_scoped: is_job_scoped
                    });
            }
            return Promise.reject(new Error('not printer owner'));
        },

        /**
         * Generate a registration code for this printer.
         * @param {String} secondary_member_email
         * @returns {Promise}
         */
        generateRegistrationCode: function (secondary_member_email) {
            if (this.is_primary) {
                return Client.authorizedApiRequest('/print/printers/' + this.id + '/secondary_registration')
                    .post({secondary_member_email: secondary_member_email})
            }
            return Promise.reject(new Error('not printer owner'));
        },

        /**
         * Get the members registered to this printer.
         * @param {Object} params - limit/offset/sort/filter options.
         * @returns {Promise} A Promise that resolves to an array of members.
         */
        getMembers: function (params) {
            return Client.authorizedApiRequest('/print/printers/' + this.id + '/members')
                .get(params)
                .then(function (data) {
                    return new ADSKSpark.PrinterMembers(data);
                })
        },

        /**
         * Unregister a printer.
         * @param {String} [member_id]
         * @returns {Promise}
         */
        unregister: function (member_id) {
            var params;
            if (member_id) {
                params = {secondary_member_id: member_id};
            }
            return Client.authorizedApiRequest('/print/printers/' + this.id)
                .delete(params);
        },

        /**
         * Get jobs for a printer.
         * @param {Object} params - limit/offset/sort/filter options.
         * @returns {Promise} - A promise that will resolve to an array of jobs.
         */
        getJobs: function (params) {
            return Client.authorizedApiRequest('/print/printers/' + this.id + '/jobs')
                .get()
                .then(function (data) {
                    return new ADSKSpark.Jobs(data);
                });
        },

        /**
         * Create a print job.
         * @param {String} printable_id
         * @param {String} printable_url
         * @param {Object} settings
         * @param {String} callback_url
         * @returns {Promise}
         */
        createJob: function (printable_id, printable_url, settings, callback_url) {
            return Client.authorizedApiRequest('/print/printers/' + this.id + '/jobs')
                .post({
                    printable_id: printable_id,
                    printable_url: printable_url,
                    settings: settings,
                    callback_url: callback_url
                });
        },

        /**
         * Start a queued print job for a printer.
         * @param {ADSKSpark.Job|String} job - Job or job id.
         * @returns {Promise}
         */
        startJob: function (job) {
            var job_id = (job instanceof ADSKSpark.Job) ? job.id : job;
            return Client.authorizedApiRequest('/print/printers/' + this.id + '/jobs')
                .put({job_id: job_id});
        }

    };

})();
