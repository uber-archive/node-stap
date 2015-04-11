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

var AddressMap = require('../address_map');
var path = require('path');
var _ = require('underscore');
var fs = require('fs');

function loadMapFromSlashProc(pid, callback) {
    var mapPath = path.join('/proc', String(pid), 'maps');
    fs.readFile(mapPath, function handleMapData(err, data) {
        if (err) {
            err.message = 'Failed to read /proc: ' + err.message;
            return callback(err);
        }

        return callback(null, parse(data));
    });
}

function isFile(line) {
    return line.length === 6 && (line[5].indexOf('[') !== 0);
}

function isExecutable(line) {
    return line[1].indexOf('x') >= 0;
}

function parse(data) {
    var lines = data.toString().split('\n');
    var map = new AddressMap();

    lines.forEach(function parseLine(line) {
        line = _.without(line.split(' '), '');
        if (!isFile(line) || !isExecutable(line)) {
            return;
        }

        var name = line[5];
        var range = line[0].split('-');
        var start = parseInt(range[0], 16);
        var end = parseInt(range[1], 16);
        var size = end - start;
        var mappedOffset = parseInt(line[2], 16);

        map.addEntry(name, start, size, mappedOffset);
    });

    return map;
}

module.exports.load = loadMapFromSlashProc;
module.exports.parse = parse;
module.exports.isFile = isFile;
