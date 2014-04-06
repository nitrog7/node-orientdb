# Introduction
This is a node.js driver for OrientDB using the OrientDB binary protocol. This driver is based on the latest version of OrientDB: 1.7.0.

# Installation
There are two ways to install the driver. The first is to use npm to download the package into your project. The second is to manually pull the repo from the server and copy it to your "node_modules" directory.

To use npm, cd into your project directory and run the command:
```
npm install node-orientdb
```

To grab the latest copy from git, you can either clone a copy from master (production) or development. Once you have it on your machine copy it to your "node_modules" directory.

# Usage

### Configuring the connection.

```javascript
var OrientDB =  require('node-orientdb');

var server = new OrientDB({
  host: 'localhost',
  port: 2424,
  username: 'admin',
  password: 'admin',
  pool: {
    max: 10
  }
});

//Query the database
var db = server.use('mydb');
db.query('SELECT FROM V LIMIT 5')
  .then(function(results) {
    console.log(results);
  });
```


# Status
The NodeJS OrientDB driver is stable. While we use it in production already and therefore it implements a sufficient number of features for making a fully featured application, we recommend you make some thorough tests before you do it as well. If you find any problems, let us know such that we can improve things.

### Supported Versions
Node-OrientDB has been tested with OrientDB 1.7. We test each release with the most recent version of OrientDB. Although we try to remain backwards compatible, it may not be fully tested. If you experience any problems with an older version than the current, please inform us.

### Driver Compatibility
To see if your version of OrientDB supports a method, please see the compatibility list: [Operation Types](https://github.com/orientechnologies/orientdb/wiki/Network-Binary-Protocol#operation-types)


# Features
- Tested with latest orientdb (1.7).
- Intuitive API, based on [bluebird](https://github.com/petkaantonov/bluebird) promises.
- Fast binary protocol parser.
- Access multiple databases via the same socket.
- Migration support.
- Simple CLI.


# Documentation
* [Quick Start](https://github.com/orientechnologies/orientdb/wiki/Quick-Start)
* [Server](https://github.com/nitrog7/node-orientdb/wiki/Server-API)
* [Database](https://github.com/nitrog7/node-orientdb/wiki/Document-Database)
    * [Records](https://github.com/nitrog7/node-orientdb/wiki/Document-Database#records)
    * [Data Clusters](https://github.com/nitrog7/node-orientdb/wiki/Document-Database#data-clusters)
    * [Data Segments](https://github.com/nitrog7/node-orientdb/wiki/Document-Database#data-cluster)
* [Graph Database](https://github.com/nitrog7/node-orientdb/wiki/Graph-Database)
    * [Vertex](https://github.com/nitrog7/node-orientdb/wiki/Graph-Database#wiki-vertex)
    * [Edge](https://github.com/nitrog7/node-orientdb/wiki/Graph-Database#wiki-edges)


# Tutorial
Overview of OrientDB and concepts:
* [Overview](http://www.youtube.com/watch?v=o_7NCiTLVis)

To start using OrientDB, check out the following YouTube tutorials based on version 1.6.2:
* [Getting Started](https://www.youtube.com/watch?v=X-pXqvVTK6E)
* [Querying](https://www.youtube.com/watch?v=w0VfWljYEbw)
* [Creating a Schema](https://www.youtube.com/watch?v=KzkjKwkpMII)
* [Populating the Database](https://www.youtube.com/watch?v=MeXLuErdDHw)
* [Using the Database](https://www.youtube.com/watch?v=oAeY-pXBi-I)


# Changes
See [ChangeLog](https://github.com/nitrog7/node-orientdb/blob/master/ChangeLog)


# History
In 2012, [Gabriel Petrovay](https://github.com/gabipetrovay) created the original [node-orientdb](https://github.com/gabipetrovay/node-orientdb) library, with a straightforward callback based API.

In early 2014, [Giraldo Rosales](https://github.com/nitrog7) made a [whole host of improvements](https://github.com/nitrog7/node-orientdb), including support for orientdb 1.7 and switched to a promise based API.

Later in 2014, [Charles Pick](https://github.com/phpnode) refactored the library to make it easier to extend and maintain, and introduced an API similar to [nano](https://github.com/dscape/nano). Forking off into a new flavor, [Oriento](https://github.com/codemix/oriento).