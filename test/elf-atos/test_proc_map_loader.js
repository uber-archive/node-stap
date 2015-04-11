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

/*
 * Currently no efforts to mock up the real /proc
 */
var test = require('tape');
var procMapLoader = require('../../lib/elf-atos/loaders/proc_map_loader');

/* eslint-disable max-len */
test('Proc map load parsing', function testParsing(assert) {
    var text = '00400000-00c5c000 r-xp 00000000 fc:00 278323                             /usr/bin/nodejs\n' +
        '00e5b000-00e5c000 r-xp 0085b000 fc:00 278323                             /usr/bin/nodejs\n' +
        '00e5c000-00e73000 rwxp 0085c000 fc:00 278323                             /usr/bin/nodejs\n' +
        '00e73000-00e7c000 rwxp 00000000 00:00 0\n' +
        '01989000-01c31000 rwxp 00000000 00:00 0                                  [heap]\n' +
        'c17c600000-c17c625000 rwxp 00000000 00:00 0\n' +
        '2d71d7e8000-2d71d7e9000 r-xp 00000000 00:00 0\n' +
        '2d7cdc96000-2d7cde96000 rwxp 00000000 00:00 0\n' +
        '501df3b7000-501df3c0000 ---p 00000000 00:00 0\n' +
        '501df3c0000-501df3e0000 rwxp 00000000 00:00 0\n';

    var map = procMapLoader.parse(text);

    assert.equal(map.entries.length, 3, 'three entries');
    assert.equal(map.entries[0].name, '/usr/bin/nodejs', 'node is first');
    assert.equal(map.entries[0].base, 0x00400000, 'at right address');
    assert.equal(map.entries[1].name, '/usr/bin/nodejs', 'node is second');
    assert.equal(map.entries[1].base, 0x00e5b000, 'at right address');
    assert.equal(map.entries[2].name, '/usr/bin/nodejs', 'node is third');
    assert.equal(map.entries[2].base, 0x00e5c000, 'at right address');
    assert.end();
});
