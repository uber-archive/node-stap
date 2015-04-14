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

var util = require('util');
var Readable = require('stream').Readable;

function truncateFramePath(frame) {
    var split = frame.split('/');
    if (split.length > 1) {
        return split[0] + split[split.length - 1];
    }

    return frame;
}

function convertFrame(frame) {
    return truncateFramePath(frame);
}

function StackVisAdaptor(stacks) {
    var self = this;

    // Skips first three
    self.done = false;
    self.lines = [' ', ' ', ' '];
    stacks.forEach(function pushStack(stack) {
        stack.forEach(function pushLine(line) {
            self.lines.push(convertFrame(line));
        });
        self.lines.push('   1');
    });

    Readable.call(self);
    self.pause();
}

util.inherits(StackVisAdaptor, Readable);

StackVisAdaptor.prototype._read = function _read() {
    if (!this.done) {
        this.done = true;
        this.push(this.lines.join('\n'));
    }

    this.push(null);
};

module.exports = StackVisAdaptor;
