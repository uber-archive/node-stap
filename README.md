## Synopsis

Tools for profiling node.js 0.10  programs.  Uses SystemTap to collect and symbolicate JavaScript backtraces and python scripts for aggregation, printing, and misc. niceties.  Only profiles JavaScript frames, line numbers are best effort (not always available) and refer to the start of a function, and may omit inlined functions, but pretty much works.  Inspired and informed by @davepacheco's excellent v8 DTrace ustack helper.  Still a work in progress.

## Code Example
dh@dh:~$ cat test.js
while (true) {
    console.log(new Error().stack)
}
dh@dh:~$ node test.js > /dev/null &
[2] 32642
dh@dh:~$ cd node-stap/
dh@dh:~/node-stap$ sudo python sample.py 32642 text 10
Sampling 32642 for 10s, outputting text.

Total samples: 1000
  1000 <empty> <unknown>:26
    1000 startup <unknown>:29
      1000 Module.runMain module.js:494
        1000 Module._load module.js:274
          1000 Module.load module.js:345
            1000 Module._extensions..js module.js:471
              1000 Module._compile module.js:373
                1000 <empty> /home/dh/test.js:0
                  79 Console.log console.js:<unknown>
                    79 Console.log console.js:<unknown>
                      16 exports.format util.js:<unknown>
                      60 SyncWriteStream.write fs.js:<unknown>
                        60 SyncWriteStream.write fs.js:<unknown>
                          9 fs.writeSync fs.js:<unknown>
                            9 fs.writeSync fs.js:<unknown>
                          49 Buffer buffer.js:<unknown>
                            49 Buffer buffer.js:<unknown>
                              30 Buffer.write buffer.js:<unknown>
                                30 Buffer.write buffer.js:<unknown>
                  7 Module module.js:36
                  6 <empty> <unknown>:203
## Motivation

Analyzing the performance of Node.js programs can be hard; 

## Installation

You'll need SystemTap installed on your system as well as the dbgsyms for your kernel.  Other than that, just clone and profile.  Note: only known to work on node0.10 (give it a try).

## Tests

All things in the fullness of time.

## Contributors

dh

## License

TBD.
