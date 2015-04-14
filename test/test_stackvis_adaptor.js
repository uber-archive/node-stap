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

var test = require('tape');
var StackVisAdaptor = require('../lib/stackvis_adaptor');

function testAdaptor(assert, stacks, expectedLines) {
    var adaptor = new StackVisAdaptor(stacks);
    var numSeen = 0;

    adaptor.on('data', function checkData(rawLine) {
        var lines = rawLine.toString().split('\n');

        lines.forEach(function checkLine(line) {
            assert.equal(line, expectedLines[numSeen++]);
        });
    });

    adaptor.on('end', function handleEnd() {
        assert.equal(numSeen, expectedLines.length, 'right number of lines');
        assert.end();
    });

    adaptor.resume();
}

test('One simple frame, output with count', function testTrivial(assert) {
    var stacks = [['main']];
    var expectedLines = [
        ' ',
        ' ',
        ' ',
        'main',
        '   1'
    ];

    testAdaptor(assert, stacks, expectedLines);
});

test('Two simple frames, output with count', function testTwoFrames(assert) {
    var stacks = [['foo', 'main']];
    var expectedLines = [
        ' ',
        ' ',
        ' ',
        'foo',
        'main',
        '   1'
    ];

    testAdaptor(assert, stacks, expectedLines);
});

test('Two stacks, output with counts', function testTwoStacks(assert) {
    var stacks = [['foo', 'main'], ['bar', 'main']];
    var expectedLines = [
        ' ',
        ' ',
        ' ',
        'foo',
        'main',
        '   1',
        'bar',
        'main',
        '   1'
    ];

    testAdaptor(assert, stacks, expectedLines);
});

test('One stack, truncate paths', function testPathTruncation(assert) {
    var stacks = [
        ['foo:/tmp/foo/bar/baz/foo.js:10', 'main:/tmp/foo/bar/baz/main.js:20']
    ];
    var expectedLines = [
        ' ',
        ' ',
        ' ',
        'foo:foo.js:10',
        'main:main.js:20',
        '   1'
    ];

    testAdaptor(assert, stacks, expectedLines);
});
