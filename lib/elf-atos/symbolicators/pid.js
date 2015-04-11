// Copyright (c) 2015 Uber Technologies, Inc.
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.
'use strict';

var async = require('async');
var Symbolicator = require('../symbolicator');
var _ = require('underscore');

function getSymbolicator(options, pid, callback) {
    options.procMapLoader.load(pid, function handleMap(mapErr, procMap) {
        if (mapErr) {
            return callback(mapErr);
        }

        var files = procMap.entries.map(function getName(entry) {
            return entry.name;
        });

        var loadFunc = options.elfLoader.load;
        async.map(files, loadFunc, function done(elfErr, symTables) {
            if (elfErr) {
                return callback(elfErr);
            }

            var nameToMap = _.object(files, symTables);
            return callback(null, new Symbolicator(procMap, nameToMap));
        });
    });
}

module.exports.get = getSymbolicator;
