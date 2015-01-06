/* jslint node: true */
'use strict';
var stream = require('stream');
var __ = require('underscore')._;

module.exports = function(self) {
  /**
   * GET method used to show the info of one database
   */
  return function(req, res, next) {
    var dbname = req.params.db;
    var db = self.databases[dbname];


    // send the changes stream (inject some vars into scope)
    function sendChanges(scope, dbname, res, req, changes, seq){ 
      var change = {};
      return function(){
        // if there are no changes, dont create a readable stream
        if(scope.changes[dbname].length > 0){
          changes = null;
          changes = new stream.Readable();
          for(var i in scope.changes[dbname]){
            change = __.clone(scope.changes[dbname][i]);
            // handle include_docs param
            if(req.query.include_docs !== 'true'){
              delete change.doc;
            }
            // handle 'since' sequence number param
            if(change.seq > seq){
              seq = change.seq;
              changes.push(JSON.stringify(change));
            }
          }
          changes.push(null);
          return changes.pipe(res);
        }
      };
    }

    // return the changes stream
    if(db && self.changes[dbname]) {
      res.setHeader('Content-Type', 'application/octet-stream');
      var changes;
      // set sequence to query param or current seq number
      var seq = req.query.since || 0;
      if(seq === 'now'){
        seq = self.sequence[dbname];
      }
      // if continuous, set an interval for sending responses
      if(req.query.feed === 'continuous'){
        setInterval(sendChanges(self, dbname, res, req, changes, seq), parseInt(req.query.heartbeat) || 1000);
      }
      else{
        return sendChanges(self, dbname, res, req, changes, seq)();
      }
    }
    else{
      res.send(404, {error:'not_found',reason:'no_db_file'});
    }
  };
};