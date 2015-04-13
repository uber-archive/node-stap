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

/* eslint-disable max-len */

var test = require('tape');
var path = require('path');
var _ = require('underscore');
var elfLoader = require('../../lib/elf-atos/loaders/elf_loader');

function elfTest(assert, binaryName, mainAddr, loadBase) {
    var binaryPath = path.join(__dirname, 'fixtures', binaryName);
    var testFile = path.join(binaryPath);
    elfLoader.load(testFile, function validateMap(err, addressMap) {
        assert.notOk(err);

        var main = _.find(addressMap.entries, function isMain(e) {
            return e.name === 'main';
        });

        assert.ok(main, 'Find main');
        assert.equal(main.base, mainAddr, 'At right address');
        assert.equal(main.loadBase, loadBase, 'With section load base');
        assert.end();
    });
}

/*
 *
 * dh@dh:~$ cat test.cpp
 * int
 * main() {
 * }
 * dh@dh:~$ g++ -rdynamic test.cpp -o simple-elf-dynamic
 * dh@dh:~$ objdump -T simple-elf-dynamic
 *
 *  simple-elf-dynamic:     file format elf64-x86-64
 *
 * DYNAMIC SYMBOL TABLE:
 * 0000000000000000      DF *UND*	0000000000000000  GLIBC_2.2.5 __libc_start_main
 * 0000000000000000  w   D  *UND*	0000000000000000              __gmon_start__
 * 0000000000000000  w   D  *UND*	0000000000000000              _Jv_RegisterClasses
 * 0000000000601018 g    D  *ABS*	0000000000000000  Base        _edata
 * 0000000000601008 g    D  .data	0000000000000000  Base        __data_start
 * 0000000000601028 g    D  *ABS*	0000000000000000  Base        _end
 * 0000000000601008  w   D  .data	0000000000000000  Base        data_start
 * 0000000000400798 g    DO .rodata	0000000000000004  Base        _IO_stdin_used
 * 00000000004006b0 g    DF .text	0000000000000089  Base        __libc_csu_init
 * 00000000004005c0 g    DF .text	0000000000000000  Base        _start
 * 0000000000601018 g    D  *ABS*	0000000000000000  Base        __bss_start
 * 00000000004006a4 g    DF .text	000000000000000b  Base        main
 * 0000000000400588 g    DF .init	0000000000000000  Base        _init
 * 0000000000400740 g    DF .text	0000000000000002  Base        __libc_csu_fini
 * 0000000000400788 g    DF .fini	0000000000000000  Base        _fini
 *
 * Sections:
 *   12 .text         000001c8  00000000004005c0  00000000004005c0  000005c0  2**4
 */
test('load simple -rdynamic file', function testSimpleLoad(assert) {
    elfTest(assert, 'simple-elf-dynamic', 0x4006a4, 0x400000);
});

/*
 * dh@dh:~$ cat test.cpp
 * int
 * main() {
 * }
 * dh@dh:~$ g++ test.cpp -o simple-elf
 * dh@dh:~$ objdump  -t simple-elf
 * dh@dh:~$ objdump  -t simple-elf
 * simple-elf:     file format elf64-x86-64
 * SYMBOL TABLE:
 *     0000000000400238 l    d  .interp	0000000000000000              .interp
 * 0000000000400254 l    d  .note.ABI-tag	0000000000000000              .note.ABI-tag
 * 0000000000400274 l    d  .note.gnu.build-id	0000000000000000              .note.gnu.build-id
 * 0000000000400298 l    d  .gnu.hash	0000000000000000              .gnu.hash
 * 00000000004002b8 l    d  .dynsym	0000000000000000              .dynsym
 * 0000000000400300 l    d  .dynstr	0000000000000000              .dynstr
 * 0000000000400338 l    d  .gnu.version	0000000000000000              .gnu.version
 * 0000000000400340 l    d  .gnu.version_r	0000000000000000              .gnu.version_r
 * 0000000000400360 l    d  .rela.dyn	0000000000000000              .rela.dyn
 * 0000000000400378 l    d  .rela.plt	0000000000000000              .rela.plt
 * 0000000000400390 l    d  .init	0000000000000000              .init
 * 00000000004003b0 l    d  .plt	0000000000000000              .plt
 * 00000000004003d0 l    d  .text	0000000000000000              .text
 * 0000000000400598 l    d  .fini	0000000000000000              .fini
 * 00000000004005a8 l    d  .rodata	0000000000000000              .rodata
 * 00000000004005ac l    d  .eh_frame_hdr	0000000000000000              .eh_frame_hdr
 * 00000000004005d8 l    d  .eh_frame	0000000000000000              .eh_frame
 * 0000000000600e28 l    d  .ctors	0000000000000000              .ctors
 * 0000000000600e38 l    d  .dtors	0000000000000000              .dtors
 * 0000000000600e48 l    d  .jcr	0000000000000000              .jcr
 * 0000000000600e50 l    d  .dynamic	0000000000000000              .dynamic
 * 0000000000600fe0 l    d  .got	0000000000000000              .got
 * 0000000000600fe8 l    d  .got.plt	0000000000000000              .got.plt
 * 0000000000601008 l    d  .data	0000000000000000              .data
 * 0000000000601018 l    d  .bss	0000000000000000              .bss
 * 0000000000000000 l    d  .comment	0000000000000000              .comment
 * 00000000004003fc l     F .text	0000000000000000              call_gmon_start
 * 0000000000000000 l    df *ABS*	0000000000000000              crtstuff.c
 * 0000000000600e28 l     O .ctors	0000000000000000              __CTOR_LIST__
 * 0000000000600e38 l     O .dtors	0000000000000000              __DTOR_LIST__
 * 0000000000600e48 l     O .jcr	0000000000000000              __JCR_LIST__
 * 0000000000400420 l     F .text	0000000000000000              __do_global_dtors_aux
 * 0000000000601018 l     O .bss	0000000000000001              completed.6531
 * 0000000000601020 l     O .bss	0000000000000008              dtor_idx.6533
 * 0000000000400490 l     F .text	0000000000000000              frame_dummy
 * 0000000000000000 l    df *ABS*	0000000000000000              crtstuff.c
 * 0000000000600e30 l     O .ctors	0000000000000000              __CTOR_END__
 * 0000000000400678 l     O .eh_frame	0000000000000000              __FRAME_END__
 * 0000000000600e48 l     O .jcr	0000000000000000              __JCR_END__
 * 0000000000400560 l     F .text	0000000000000000              __do_global_ctors_aux
 * 0000000000000000 l    df *ABS*	0000000000000000              test.cpp
 * 0000000000600e24 l       .ctors	0000000000000000              __init_array_end
 * 0000000000600e50 l     O .dynamic	0000000000000000              _DYNAMIC
 * 0000000000600e24 l       .ctors	0000000000000000              __init_array_start
 * 0000000000600fe8 l     O .got.plt	0000000000000000              _GLOBAL_OFFSET_TABLE_
 * 0000000000400550 g     F .text	0000000000000002              __libc_csu_fini
 * 0000000000601008  w      .data	0000000000000000              data_start
 * 0000000000601018 g       *ABS*	0000000000000000              _edata
 * 0000000000400598 g     F .fini	0000000000000000              _fini
 * 0000000000600e40 g     O .dtors	0000000000000000              .hidden __DTOR_END__
 * 0000000000000000       F *UND*	0000000000000000              __libc_start_main@@GLIBC_2.2.5
 * 0000000000601008 g       .data	0000000000000000              __data_start
 * 0000000000000000  w      *UND*	0000000000000000              __gmon_start__
 * 0000000000601010 g     O .data	0000000000000000              .hidden __dso_handle
 * 00000000004005a8 g     O .rodata	0000000000000004              _IO_stdin_used
 * 00000000004004c0 g     F .text	0000000000000089              __libc_csu_init
 * 0000000000601028 g       *ABS*	0000000000000000              _end
 * 00000000004003d0 g     F .text	0000000000000000              _start
 * 0000000000601018 g       *ABS*	0000000000000000              __bss_start
 * 00000000004004b4 g     F .text	000000000000000b              main
 * 0000000000000000  w      *UND*	0000000000000000              _Jv_RegisterClasses
 * 0000000000400390 g     F .init	0000000000000000              _init
 *
 * Sections
 *   12 .text         000001c8  00000000004003d0  00000000004003d0  000003d0  2**4
 */
test('load simple non-rdynamic file', function testSimpleLoad(assert) {
    elfTest(assert, 'simple-elf', 0x4004b4, 0x400000);
});
