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

/* global console, process */
/* eslint-disable no-console, no-process-exit */

var atos = require('../lib/elf-atos/elf-atos');
var util = require('util');

function usage() {
    console.error('Usage: atos <pid> <hex addr>');
    process.exit(1);
}

if (process.argv.length !== 4) {
    usage();
}

var pid = parseInt(process.argv[2], 10);
var addr = parseInt(process.argv[3], 16);

atos.getSymbolicatorForPid(pid, function printSym(err, symbolicator) {
    if (err) {
        console.error('Failed to symbolicate.');
        process.exit(1);
    }

    var sym = symbolicator.atos(addr);
    console.log(util.format('%s: %s', process.argv[3], sym));
});
