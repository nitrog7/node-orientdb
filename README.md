# Oriento

A lightweight node.js driver for [orientdb](http://www.orientechnologies.com/orientdb/) using orient's binary protocol.

> **status: alpha**
> This is work in progress, alpha quality software.
> Please [report any bugs](https://github.com/codemix/oriento/issues) you find so that we can improve the library for everyone.



# Supported Versions

Oriento aims to work with version 1.7 of orientdb and later. While it may work with earlier versions, they are not currently supported, [pull requests are welcome!](./CONTRIBUTING.md)



# Installation

Install via npm.

```
npm install oriento
```

# Features

- Tested with latest orientdb (1.7).
- Intuitive API, based on [bluebird](https://github.com/petkaantonov/bluebird) promises.
- Fast binary protocol parser.
- Access multiple databases via the same socket.
- Migration support.
- Simple CLI.

# Usage

### Configuring the connection.

```js
var Oriento =  require('oriento');

var server = Oriento({
  host: 'localhost',
  port: 2424,
  username: 'root',
  password: 'yourpassword'
});
```

### Listing the databases on the server

```js
server.list()
.then(function (dbs) {
  console.log('There are ' + dbs.length + ' databases on the server.');
});
```

### Creating a new database

```js
server.create({
  name: 'mydb',
  type: 'graph',
  storage: 'plocal'
})
.then(function (db) {
  console.log('Created a database called ' + db.name);
});
```

### Using an existing database

```js
var db = server.use('mydb');
console.log('Using database: ' + db.name);
```

### Using an existing database with credentials

```js
var db = server.use({
  name: 'mydb',
  username: 'admin',
  password: 'admin'
});
console.log('Using database: ' + db.name);
```

### Query Builder: Insert Record

```js
db.insert().into('OUser').set({name: 'demo', password: 'demo', status: 'ACTIVE'}).one()
.then(function (user) {
  console.log('created', user);
});
```

### Query Builder: Update Record

```js
db.update('OUser').set({password: 'changed'}).where({name: 'demo'}).scalar()
.then(function (total) {
  console.log('updated', total, 'users');
});
```

### Query Builder: Delete Record

```js
db.delete().from('OUser').where({name: 'demo'}).limit(1).scalar()
.then(function (total) {
  console.log('deleted', total, 'users');
});
```


### Query Builder: Select Records

```js
db.select().from('OUser').where({status: 'ACTIVE'}).all()
.then(function (users) {
  console.log('active users', users);
});
```

### Query Builder: Select Records with Fetch Plan

```js
db.select().from('OUser').where({status: 'ACTIVE'}).fetch({role: 5}).all()
.then(function (users) {
  console.log('active users', users);
});
```

### Query Builder: Select an expression

```js
db.select('count(*)').from('OUser').where({status: 'ACTIVE'}).scalar()
.then(function (total) {
  console.log('total active users', total);
});
```

### Query Builder: Traverse Records

```js
db.traverse().from('OUser').where({name: 'guest'}).all()
.then(function (records) {
  console.log('found records', records);
});
```



### Loading a record by RID.

```js
db.record.get('#1:1')
.then(function (record) {
  console.log('Loaded record:', record);
});
```

### Deleting a record

```js
db.record.delete('#1:1')
.then(function () {
  console.log('Record deleted');
});
```

### Listing all the classes in the database

```js
db.class.list()
.then(function (classes) {
  console.log('There are ' + classes.length + ' classes in the db:', classes);
});
```

### Creating a new class

```js
db.class.create('MyClass')
.then(function (MyClass) {
  console.log('Created class: ' + MyClass.name);
});
```

### Creating a new class that extends another

```js
db.class.create('MyOtherClass', 'MyClass')
.then(function (MyOtherClass) {
  console.log('Created class: ' + MyOtherClass.name);
});
```

### Getting an existing class

```js
db.class.get('MyClass')
.then(function (MyClass) {
  console.log('Got class: ' + MyClass.name);
});
```

### Listing properties in a class

```js
MyClass.property.list()
.then(function (properties) {
  console.log('The class has the following properties:', properties);
});
```

### Adding a property to a class

```js
MyClass.property.create({
  name: 'name',
  type: 'String'
})
.then(function () {
  console.log('Property created.')
});
```

### Deleting a property from a class

```js
MyClass.property.delete('myprop')
.then(function () {
  console.log('Property deleted.');
});
```

### Creating a record for a class

```js
MyClass.create({
  name: 'John McFakerton',
  email: 'fake@example.com'
})
.then(function (record) {
  console.log('Created record: ', record);
});
```

### Listing records in a class

```js
MyClass.list()
.then(function (records) {
  console.log('Found ' + records.length + ' records:', records);
});
```

### Creating a new, empty vertex

```js
db.vertex.create('V')
.then(function (vertex) {
  console.log('created vertex', vertex);
});
```

### Creating a new vertex with some properties

```js
db.vertex.create({
  '@class': 'V',
  key: 'value',
  foo: 'bar'
})
.then(function (vertex) {
  console.log('created vertex', vertex);
});
```
### Deleting a vertex

```js
db.vertex.delete('#12:12')
.then(function (count) {
  console.log('deleted ' + count + ' vertices');
});
```

### Creating a simple edge between vertices

```js
db.edge.from('#12:12').to('#12:13').create('E')
.then(function (edge) {
  console.log('created edge:', edge);
});
```


### Creating an edge with properties

```js
db.edge.from('#12:12').to('#12:13').create({
  '@class': 'E',
  key: 'value',
  foo: 'bar'
})
.then(function (edge) {
  console.log('created edge:', edge);
});
```

### Deleting an edge between vertices

```js
db.edge.from('#12:12').to('#12:13').delete({
.then(function (count) {
  console.log('deleted ' + count + ' edges');
});
```


# CLI

An extremely minimalist command line interface is provided to allow
databases to created and migrations to be applied via the terminal.

To be useful, oriento requires some arguments to authenticate against the server. All operations require the `password` argument unless the user is configured with an empty password. For operations that involve a specific db, include the `dbname` argument (with `dbuser` and `dbpassword` if they are set to something other than the default).

You can get a list of the supported arguments using `oriento --help`.

```
  -d, --cwd         The working directory to use.
  -h, --host        The server hostname or IP address.
  -p, --port        The server port.
  -u, --user        The server username.
  -s, --password    The server password.
  -n, --dbname      The name of the database to use.
  -U, --dbuser      The database username.
  -P, --dbpassword  The database password.
  -?, --help        Show the help screen.
```

If it's too tedious to type these options in every time, you can also create an `oriento.opts` file containing them. Oriento will search for this file in the working directory and apply any arguments it contains.
For an example of such a file, see [test/fixtures/oriento.opts](./test/fixtures/oriento.opts).


> Note: For brevity, all these examples assume you've installed oriento globally (`npm install -g oriento`) and have set up an oriento.opts file with your server and database credentials.

## Database CLI Commands.

### Listing all the databases on the server.

`oriento db list`

### Creating a new database

`oriento db create mydb graph plocal`

### Destroying an existing database

`oriento db delete mydb`

## Migrations

Oriento supports a simple database migration system. This makes it easy to keep track of changes to your orientdb database structure between multiple environments and distributed teams.

When you run a migration command, oriento first looks for an orient class called `Migration`. If this class doesn't exist it will be created.
This class is used to keep track of the migrations that have been applied.

Oriento then looks for migrations that have not yet been applied in a folder called `migrations`. Each migration consists of a simple node.js module which exports two methods - `up()` and `down()`. Each method receives the currently selected database instance as an argument.

The `up()` method should perform the migration and the `down()` method should undo it.

> Note: Migrations can incur data loss! Make sure you back up your database before migrating up and down.

In addition to the command line options outlined below, it's also possible to use the migration API programatically:

```js
var db = server.use('mydb');

var manager = new Oriento.Migration.Manager({
  db: db,
  dir: __dirname + '/migrations'
});

manager.up(1)
.then(function () {
  console.log('migrated up by one!')
});
```


### Listing the available migrations

To list all the unapplied migrations:

`oriento migrate list`

### Creating a new migration

`oriento migrate create my new migration`

creates a file called something like `m20140318_200948_my_new_migration` which you should edit to specify the migration up and down methods.


### Migrating up fully

To apply all the migrations:

`oriento migrate up`

### Migrating up by 1

To apply only the first migration:

`oriento migrate up 1`

### Migrating down fully

To revert all migrations:

`oriento migrate down`

### Migrating down by 1

`oriento migrate down 1`


# History

In 2012, [Gabriel Petrovay](https://github.com/gabipetrovay) created the original [node-orientdb](https://github.com/gabipetrovay/node-orientdb) library, with a straightforward callback based API.

In early 2014, [Giraldo Rosales](https://github.com/nitrog7) made a [whole host of improvements](https://github.com/nitrog7/node-orientdb), including support for orientdb 1.7 and switched to a promise based API.

Later in 2014, codemix refactored the library to make it easier to extend and maintain, and introduced an API similar to [nano](https://github.com/dscape/nano). The result is so different from the original codebase that it warranted its own name and npm package. This also gave us the opportunity to switch to semantic versioning.



# Notes for contributors

Please see [CONTRIBUTING](./CONTRIBUTING.md).

# Changes

See [CHANGELOG](./CHANGELOG.md)



# License

Apache 2.0 License, see [LICENSE](./LICENSE.md)
