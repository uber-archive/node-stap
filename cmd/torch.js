#!/usr/bin/env node

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

/* global process, console */
/* eslint-disable no-console, no-process-exit */

var util = require('util');
var stackvis = require('stackvis');
var _ = require('underscore');
var aggregation = require('../lib/aggregation');
var NodeProfiler = require('../lib/node_profiler');
var StackVisAdaptor = require('../lib/stackvis_adaptor');
var Bunyan = require('bunyan');

var VALID_OUTPUT_FORMATS = ['text', 'flame', 'dtracetext'];
var MAX_TIME_SECONDS = 30;

var log = new Bunyan({
    'name': 'torch',
    'stream': process.stderr
});

// Pretty reasonable... maybe.  Not configurable for safety

var MAXACTIONS = 10000;

function die(msg) {
    console.error(msg);
    process.exit(1);
}

// Should really be geteuid
function amIRoot() {
    return process.getuid() === 0;
}

function pidExists(pid) {
    // jscs:disable disallowKeywords
    try {
        process.kill(pid, 0);
    } catch (e) {
        return false;
    }
    // jscs:enable disallowKeywords

    return true;
}

function parseArgs(argv) {
    if (argv.length !== 5) {
        die('Usage: torch <pid> <text|flame> <duration (s)>');
    }

    var pid = parseInt(argv[2], 10);
    if (_.isNaN(pid)) {
        die('Pid must be an integer');
    }

    var outputFormat = argv[3];
    if (!_.contains(VALID_OUTPUT_FORMATS, outputFormat)) {
        die('Output format must be "flame," "dtracetext," or "text"');
    }

    var durationSeconds = parseInt(argv[4], 10);
    if (_.isNaN(durationSeconds)) {
        die('Duration must be an integer');
    }
    if (durationSeconds > MAX_TIME_SECONDS) {
        die(util.format('Sample for max %ds (for safety).', MAX_TIME_SECONDS));
    }

    return {
        pid: pid,
        outputFormat: outputFormat,
        durationSeconds: durationSeconds
    };
}

function outputText(stacks) {
    stacks.forEach(function reverse(stack) {
        stack.reverse();
    });
    console.log(aggregation.aggregate(stacks).display());
}

function outputFlameGraph(stacks) {
    /* eslint-disable new-cap */
    var reader = new stackvis.readerLookup('dtrace');
    var writer = new stackvis.writerLookup('flamegraph-svg');
    /* eslint-enable new-cap */

    var adaptor = new StackVisAdaptor(stacks);

    stackvis.pipeStacks(log, adaptor, reader, writer,
        process.stdout, function nop() {});

    adaptor.resume();
}

function outputDTraceText(stacks) {
    var adaptor = new StackVisAdaptor(stacks);
    adaptor.on('data', function outputData(data) {
        console.log(data.toString());
    });

    adaptor.resume();
}

function main() {
    if (!amIRoot()) {
        die('Root privileges required.');
    }

    var args = parseArgs(process.argv);
    if (!pidExists(args.pid)) {
        die(util.format('Process %d does not exist.', args.pid));
    }

    console.error(util.format('Sampling %d for %ds, outputting %s.\n',
        args.pid, args.durationSeconds, args.outputFormat));

    var profiler = new NodeProfiler(console);
    var time = args.durationSeconds * 1000;
    profiler.profile(args.pid, time, MAXACTIONS, function done(err, stacks) {
        if (err) {
            return die('Failed to profile', err);
        }

        if (args.outputFormat === 'flame') {
            outputFlameGraph(stacks);
        } else if (args.outputFormat === 'dtracetext') {
            outputDTraceText(stacks);
        } else {
            outputText(stacks);
        }
    });
}

if (require.main === module) {
    process.nextTick(main);
} else {
    module.exports = {
        amIRoot: amIRoot,
        parseArgs: parseArgs,
        pidExists: pidExists
    };
}
