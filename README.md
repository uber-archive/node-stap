## Synopsis

Tools for profiling node.js 0.10  programs.  Uses SystemTap to collect and symbolicate JavaScript backtraces, extracting human-readable names by walking the V8 stack and heap.
Uses wrapper scripts and [node-stackvis](https://github.com/joyent/node-stackvis) to generate textual or SVG flamegraphs.
Can also output text suitable for input to to [FlameGraph] (https://github.com/brendangregg/FlameGraph).

Inspired and informed by Dave Pacheco's excellent [V8 DTrace ustack helper](https://www.joyent.com/blog/understanding-dtrace-ustack-helpers).

## Safety

**SystemTap is invasive; recommended to try in safe environments before running in production!**

## Caveats

* Only profiles JavaScript frames.
* Line numbers are best effort (not always available) and refer to the start of a function.
* Only tested on node0.10 so far.
* Stacks may omit inlined functions.
* Also may elide frames on very deep stacks to avoid doing too much work in SystemTap probe context.

## Basic Usage

```
dh@dh:~/node-stap$ sudo cmd/torch.js
Usage: torch <pid> <text|flame> <duration (s)>
```

## SVG Example

```
dh@dh:~/node-stap$ sudo cmd/torch.js 24701 flame 10 > /tmp/flame.svg
Sampling 24701 for 10s, outputting flame.

dh@dh:~/node-stap$ # done
```

## Text Example

```
dh@dh:~$ cat test.js
while (true) {
    console.log(new Error().stack)
}
dh@dh:~$ node test.js > /dev/null &
[1] 26314
dh@dh:~$ cd node-stap/
dh@dh:~/node-stap$ sudo ./cmd/torch.js 26314 text 10
Sampling 26314 for 10s, outputting text.

Total samples: 873
873 [empty]:[unknown]:26
  873 startup:[unknown]:29
    873 Module.runMain:module.js:494
      873 Module._load:module.js:274
        873 Module.load:module.js:345
          873 Module._extensions..js:module.js:471
            873 Module._compile:module.js:373
              873 [empty]:/home/dh/test.js:0
                78 Console.log:console.js:[unknown]
                  78 Console.log:console.js:[unknown]
                    56 SyncWriteStream.write:fs.js:[unknown]
                      56 SyncWriteStream.write:fs.js:[unknown]
                        45 Buffer:buffer.js:[unknown]
                          45 Buffer:buffer.js:[unknown]
                            27 Buffer.write:buffer.js:[unknown]
                              27 Buffer.write:buffer.js:[unknown]
                        11 fs.writeSync:fs.js:[unknown]
                          11 fs.writeSync:fs.js:[unknown]
                    21 exports.format:util.js:[unknown]
                1 [empty]::[unknown]
                4 Module:module.js:36
                4 [empty]:[unknown]:203

dh@dh:~/node-stap$
```

## Installation

You'll need SystemTap installed on your system as well as the dbgsyms for your kernel.  Other than that, just clone and profile as above.

## Tests

All things in the fullness of time.

## Contributors

dh

## Coming soon

* Native frames.

## License

node-stap is available under the MIT license. See the LICENSE file for more info.
