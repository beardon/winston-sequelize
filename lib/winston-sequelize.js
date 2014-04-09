//
// winston-sequelize.js: Transport for outputting to a database
//

var Sequelize = require('sequelize');
var util = require('util');
var winston = require('winston');

//
// ### function sequelize (options)
// Constructor for the Sequelize transport object.
//
var sequelize = exports.Sequelize = function (options) {
    options = options || {};

    // Winston options
    this.name = 'Sequelize';
    this.level = options.level || 'info';

    // Sequelize options
    this.dialect = options.dialect || 'mysql';
    this.host = options.host || 'localhost';
    this.port = options.port || 3306;
    this.database = options.database || 'log';
    this.username = options.username || null;
    this.password = options.password || null;
    this.omitNull = options.omitNull || false;
    this.table = options.table || 'log';
    this.safe = options.safe || true;
    this.logging = options.logging || false;
    this.silent = options.silent || false;

    this.sequelize = new Sequelize(
        this.database,
        this.username,
        this.password,
        {
            dialect: this.dialect,
            host: this.host,
            port: this.port,
            omitNull: this.omitNull,
            logging: this.logging,
            define: {
                underscored: true
            }
        }
    );

    this.LogModel = this.sequelize.define('Log',
        {
            id: {
                type: Sequelize.INTEGER,
                primaryKey: true
            },
            level: {
                type: Sequelize.STRING
            },
            msg: {
                type: Sequelize.TEXT
            },
            meta: {
                type: Sequelize.TEXT
            },
            created_at: {
                type: Sequelize.DATE
            },
            ip_address: {
                type: Sequelize.STRING
            },
            session_id: {
                type: Sequelize.STRING
            }
        },
        {
            tableName: this.table,
            timestamps: false
        }
    )

};

//
// Inherit from `winston.Transport`.
//
util.inherits(sequelize, winston.Transport);

//
// Define a getter so that `winston.transports.Sequelize`
// is available and thus backwards compatible.
//
winston.transports.Sequelize = sequelize;

//
// ### function log (level, msg, [meta], callback)
// #### @level {string} Level at which to log the message.
// #### @msg {string} Message to log
// #### @meta {Object} **Optional** Additional metadata to attach
// #### @callback {function} Continuation to respond to when complete.
// Core logging method exposed to Winston. Metadata is optional.
//
sequelize.prototype.log = function (level, msg, meta, callback) {
    if (this.silent) {
        return callback(null, true);
    }

    if (typeof meta !== 'object' && meta != null) {
        meta = { meta: meta };
    }

    var metaString = null;
    var ipAddress = null;
    var sessionId = null;
    if (Object.keys(meta).length !== 0) {
        if (meta.meta) {
            metaString = JSON.stringify(meta.meta);
            ipAddress = meta.ip;
            sessionId = meta.session;
        } else {
            metaString = JSON.stringify(meta);
        }
    }

    return this.LogModel.create({level: level, msg: msg, meta: metaString, created_at: new Date(), ip_address: ipAddress, session_id: sessionId})
        .success(function (log) {
            return callback(null, true);
        })
        .error(function (err) {
            return callback(err);
        });
};

//
// ### function close ()
// Cleans up resources (streams, event listeners) for
// this instance (if necessary).
//
sequelize.prototype.close = function () {
    this.sequelize.connectorManager.disconnect();
};
