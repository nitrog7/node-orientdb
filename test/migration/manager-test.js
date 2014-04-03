var Promise = require('bluebird'),
    fs = Promise.promisifyAll(require('fs')),
    path = require('path');



describe("Migration Manager", function () {
  before(function (done) {
    CREATE_TEST_DB(this, 'testdb_dbapi_migration')
    .bind(this)
    .then(function () {
      this.manager = new LIB.Migration.Manager({
        db: this.db,
        dir: path.join(__dirname,'..', 'fixtures/migrations')
      });
      done();
    }, done)
    .done();
  });
  after(function (done) {
    DELETE_TEST_DB('testdb_dbapi_migration')
    .then(done, done)
    .done();
  });

  describe('Migration.Manager::create()', function () {
    before(function (done) {
      this.manager.create('my test migration')
      .bind(this)
      .then(function (filename) {
        this.filename = filename;
        done();
      }, done).done();
    });
    after(function (done) {
      fs.unlinkAsync(this.filename)
      .then(function () {
        done();
      }, done)
      .done();
    })
    it('should create a migration', function () {
      fs.existsSync(this.filename).should.be.true;
    });
  });

  describe('Migration.Manager::listAvailable()', function () {
    it('should list the available migrations', function (done) {
      this.manager.listAvailable()
      .then(function (files) {
        files.length.should.be.above(0);
        done();
      }, done).done();
    })
  });

  describe('Migration.Manager::ensureStructure()', function () {
    it('should ensure the migration class exists', function (done) {
      this.manager.ensureStructure()
      .then(function (response) {
        done();
      }, done).done();
    })
  });

  describe('Migration.Manager::listApplied()', function () {
    it('should list the applied migrations', function (done) {
      this.manager.listApplied()
      .then(function (migrations) {
        migrations.length.should.equal(0);
        done();
      }, done).done();
    })
  });

  describe('Migration.Manager::list()', function () {
    it('should list the missing migrations', function (done) {
      this.manager.list()
      .then(function (migrations) {
        migrations.length.should.equal(2);
        done();
      }, done).done();
    })
  });

  describe('Migration.Manager::loadMigration()', function () {
    it('should load the given migration', function () {
      var migration = this.manager.loadMigration('m20140318_014253_my_test_migration');
      migration.name.should.equal('my test migration');
    })
  });

  describe('Migration.Manager::up()', function () {
    it('should migrate up by one', function (done) {
      this.manager.up(1)
      .bind(this)
      .then(function (response) {
        response.length.should.equal(1);
        return this.manager.listApplied();
      })
      .then(function (items) {
        items.length.should.equal(1);
        return this.manager.list();
      })
      .then(function (items) {
        items.length.should.equal(1);
        done();
      }, done)
      .done();
    });
    it('should migrate up fully', function (done) {
      this.manager.up()
      .bind(this)
      .then(function (response) {
        response.length.should.equal(1);
        return this.manager.list();
      })
      .then(function (items) {
        items.length.should.equal(0);
        done();
      }, done).done();
    });
  });

  describe('Migration.Manager::down()', function () {
    it('should migrate down by one', function (done) {
      this.manager.down(1)
      .bind(this)
      .then(function (response) {
        response.length.should.equal(1);
        return this.manager.listApplied();
      })
      .then(function (items) {
        items.length.should.equal(1);
        return this.manager.list();
      })
      .then(function (items) {
        items.length.should.equal(1);
        done();
      }, done)
      .done();
    });
    it('should migrate down fully', function (done) {
      this.manager.down()
      .bind(this)
      .then(function (response) {
        response.length.should.equal(1);
        return this.manager.list();
      })
      .then(function (items) {
        items.length.should.equal(2);
        done();
      }, done).done();
    });
  });

});