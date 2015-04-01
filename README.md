## Synopsis

Tools for profiling node.js 0.10  programs.  Uses SystemTap to collect and symbolicate JavaScript backtraces, extracting human-readable names by walking the V8 stack and heap.  Uses python scripts (likely node instead soon) for aggregation, printing, and various niceties. 

Outputs either text for quick command-line inspection or a format suitable for inputting to [FlameGraph] (https://github.com/brendangregg/FlameGraph) or [node-stackvis](https://github.com/joyent/node-stackvis).

Caveats: only profiles JavaScript frames, line numbers are best effort (not always available) and refer to the start of a function, and stacks may omit inlined functions. But, it pretty much works.  

Inspired and informed by Dave Pacheco's excellent [V8 DTrace ustack helper](https://www.joyent.com/blog/understanding-dtrace-ustack-helpers) 

A work in progress.

## Text Example
```
dh@dh:~$ cat test.js
while (true) {
    console.log(new Error().stack)
}
dh@dh:~$ node test.js  > /dev/null &
[1] 9861
dh@dh:~$ cd node-stap/
dh@dh:~/node-stap$ sudo python sample.py 9861 text 10 
Sampling 9861 for 10s, outputting text.


Total samples: 1309
  1309 <empty>:<unknown>:26
    1309 startup:<unknown>:29
      1309 Module.runMain:module.js:494
        1309 Module._load:module.js:274
          1309 Module.load:module.js:345
            1309 Module._extensions..js:module.js:471
              1309 Module._compile:module.js:373
                1309 <empty>:/home/dh/test.js:0
                  1 Module._extensions..js:module.js:471
                  1 Module.load:module.js:345
                  122 Console.log:console.js:<unknown>
                    120 Console.log:console.js:<unknown>
                      23 exports.format:util.js:<unknown>
                      97 SyncWriteStream.write:fs.js:<unknown>
                        97 SyncWriteStream.write:fs.js:<unknown>
                          19 fs.writeSync:fs.js:<unknown>
                            19 fs.writeSync:fs.js:<unknown>
                              1 isBuffer:buffer.js:<unknown>
                          74 Buffer:buffer.js:<unknown>
                            73 Buffer:buffer.js:<unknown>
                              52 Buffer.write:buffer.js:<unknown>
                                51 Buffer.write:buffer.js:<unknown>
                  12 Module:module.js:36
                  2 <empty>:<unknown>:203
```

## SVG Example

```
dh@dh:~/node-stap$ sudo python sample.py 2622 flame 5 > /tmp/stacks.txt 
dh@dh:~/node-stap$ cd ../node-stackvis/
dh@dh:~/node-stackvis$ ./cmd/stackvis  < /tmp/stacks.txt dtrace flamegraph-svg > ../flame.svg
```

## Motivation

Analyzing the performance of Node.js programs can be hard; so can debugging stuck processes.  These tools are intended to make both a bit easier.

## Installation

You'll need SystemTap installed on your system as well as the dbgsyms for your kernel.  Other than that, just clone and profile as above.  Note: only known to work on node0.10 (give it a try).

## Tests

All things in the fullness of time.

## Contributors

dh

## Coming soon

Port of wrapper scripts to Node for possible open source release.  Wrap SVG generation so flamegraphs take just one step.  Possibly native frames.

## License

node-stap is available under the MIT license. See the LICENSE file for more info.
