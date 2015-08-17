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

var VALID_OUTPUT_FORMATS = ['text', 'flame', 'raw', 'svg'];
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

function usage() {
    console.error('Usage: torch <pid> <text|flame|svg|raw> <duration (s)>');
    console.error('\ttext: textual flame graph.');
    console.error('\tflame: html flame graph.');
    console.error('\tsvg: svg flame graph.');
    console.error('\traw: format suitable for input to FlameGraph tools.');
    process.exit(1);
}

function parseArgs(argv) {
    if (argv.length !== 5) {
        usage();
    }

    var pid = parseInt(argv[2], 10);
    if (_.isNaN(pid)) {
        die('Pid must be an integer');
    }

    var outputFormat = argv[3];
    if (!_.contains(VALID_OUTPUT_FORMATS, outputFormat)) {
        die('Output format must be "flame," "raw," or "text"');
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
    var writer = new stackvis.writerLookup('flamegraph-d3');
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

function outputSVG(stacks) {
    var path = require('path');
    var os = require('os');
    var fs = require('fs');
    var exec = require('child_process').exec;

    var adaptor = new StackVisAdaptor(stacks);
    var tempFile = path.join(os.tmpDir(), 'stack.raw');
    var tempFile2 = path.join(os.tmpDir(), 'stack.folded');

    adaptor.pipe(fs.createWriteStream(tempFile))
        .once('finish', fileWritten);

    adaptor.resume();

    function fileWritten() {
        var stackCollapse = path.join(
            __dirname,
            '..',
            'bg-flamegraphs',
            'stackcollapse-stap.pl'
        );

        var command = [
            'perl ',
            stackCollapse,
            ' ',
            tempFile,
            ' | tr -d "\\0"'
        ].join('');

        exec(command, {
            maxBuffer: 1024 * 1024 * 200
        }, onOut);
    }

    function onOut(err, stdout) {
        if (err) {
            return die('Could not stack collapse. ' + err.message);
        }

        fs.writeFile(tempFile2, stdout, onFoldedWritten);
    }

    function onFoldedWritten() {
        var flamegraph = path.join(
            __dirname,
            '..',
            'bg-flamegraphs',
            'flamegraph.pl'
        );

        var command = [
            'perl ',
            flamegraph,
            ' ',
            tempFile2
        ].join('');

        exec(command, {
            maxBuffer: 1024 * 1024 * 200
        }, onSVGOut);
    }

    function onSVGOut(err, stdout) {
        if (err) {
            return die('Could not generate svg. ' + err.message);
        }

        console.log(stdout.toString());
    }
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
            return die('Exiting due to profiling failure.', err);
        }

        if (args.outputFormat === 'flame') {
            outputFlameGraph(stacks);
        } else if (args.outputFormat === 'raw') {
            outputDTraceText(stacks);
        } else if (args.outputFormat === 'svg') {
            outputSVG(stacks);
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
