var Query = require('../../lib/db/query');

describe("Database API - Query", function() {
  before(function(done) {
    CREATE_TEST_DB(this, 'testdb_dbapi_query')
      .then(done, done)
      .done();
  });
  after(function(done) {
    DELETE_TEST_DB('testdb_dbapi_query')
      .then(done, done)
      .done();
  });

  beforeEach(function() {
    this.query = new Query(this.db);
  });

  describe('Query::one()', function() {
    it('should return one record', function(done) {
      this.query.select().from('OUser').limit(1).one()
        .then(function(user) {
          Array.isArray(user).should.be.false;
          user.should.have.property('name');
          done();
        }, done).done();
    });
    it('should return one record with parameters', function(done) {
      this.query.select().from('OUser').where('name = :name').limit(1).one({name: 'reader'})
        .then(function(user) {
          Array.isArray(user).should.be.false;
          user.should.have.property('name');
          user.name.should.equal('reader');
          done();
        }, done).done();
    });
  });
  describe('Query::all()', function() {
    it('should return all the records', function(done) {
      this.query.select().from('OUser').limit(2).all()
        .then(function(users) {
          Array.isArray(users).should.be.true;
          users.length.should.equal(2);
          done();
        }, done).done();
    });
    it('should return all the records with parameters', function(done) {
      this.query.select().from('OUser').where('name = :name').all({name: 'reader'})
        .then(function(users) {
          Array.isArray(users).should.be.true;
          users.length.should.equal(1);
          users[0].should.have.property('name');
          users[0].name.should.equal('reader');
          done();
        }, done).done();
    });
  });
  describe('Query::scalar()', function() {
    it('should return the scalar result', function(done) {
      this.query.select('count(*)').from('OUser').scalar()
        .then(function(response) {
          response.should.equal(3);
          done();
        }, done).done();
    });
    it('should return the scalar result, even when many columns are selected', function(done) {
      this.query.select('count(*), max(count(*))').from('OUser').scalar()
        .then(function(response) {
          response.should.equal(3);
          done();
        }, done).done();
    });
    it('should return the scalar result with parameters', function(done) {
      this.query.select('name').from('OUser').where('name = :name').scalar({name: 'reader'})
        .then(function(name) {
          name.should.equal('reader');
          done();
        }, done).done();
    });
  });

  describe('Query::transform()', function() {
    it('should apply a single transform function', function(done) {
      this.query
        .select()
        .from('OUser')
        .transform(function(user) {
          user.wat = true;
          return user;
        })
        .limit(1)
        .one()
        .then(function(user) {
          user.wat.should.be.true;
          done();
        }, done)
        .done();
    });

    it('should transform values according to an object', function(done) {
      this.query
        .select()
        .from('OUser')
        .transform({
          '@rid': String,
          name: function(name) {
            return name.toUpperCase();
          }
        })
        .where({name: 'reader'})
        .limit(1)
        .one()
        .then(function(user) {
          (typeof user['@rid']).should.equal('string');
          user.name.should.equal('READER');
          done();
        }, done)
        .done();
    });

    it('should apply multiple transforms in order', function(done) {
      this.query
        .select()
        .from('OUser')
        .transform(function(user) {
          user.wat = true;
          return user;
        })
        .transform({
          '@rid': String,
          name: function(name) {
            return name.toUpperCase();
          }
        })
        .where({name: 'reader'})
        .limit(1)
        .one()
        .then(function(user) {
          user.wat.should.be.true;
          (typeof user['@rid']).should.equal('string');
          user.name.should.equal('READER');
          done();
        }, done)
        .done();
    });
  });

  describe('Query::column()', function() {
    it('should return a specific column', function(done) {
      this.query
        .select('name')
        .from('OUser')
        .column('name')
        .all()
        .then(function(names) {
          names.length.should.be.above(2);
          (typeof names[0]).should.equal('string');
          (typeof names[1]).should.equal('string');
          (typeof names[2]).should.equal('string');
          done();
        }, done)
        .done();
    });

    it('should return two columns', function(done) {
      this.query
        .select('name', 'status')
        .from('OUser')
        .column('name', 'status')
        .all()
        .then(function(results) {
          results.length.should.be.above(2);
          results.map(function(result) {
            Object.keys(result).length.should.equal(2);
            result.should.have.property('name');
            result.should.have.property('status');
          });
          done();
        }, done)
        .done();
    });

    it('should alias columns to different names', function(done) {
      this.query
        .select()
        .from('OUser')
        .column({
          name: 'nom',
          status: 'stat'
        })
        .all()
        .then(function(results) {
          results.length.should.be.above(2);
          results.map(function(result) {
            Object.keys(result).length.should.equal(2);
            result.should.have.property('nom');
            result.should.have.property('stat');
          });
          done();
        }, done)
        .done();
    });
  });

  describe('Query::defaults()', function() {
    it('should apply the given default values', function(done) {
      this.query
        .select()
        .from('OUser')
        .defaults({
          name: 'NEVER_MATCHES',
          nonsense: true
        })
        .where({name: 'reader'})
        .limit(1)
        .one()
        .then(function(user) {
          user.name.should.equal('reader');
          user.nonsense.should.be.true;
          done();
        }, done)
        .done();
    });

    it('should apply the given default values to many records', function(done) {
      this.query
        .select()
        .from('OUser')
        .defaults({
          name: 'NEVER_MATCHES',
          nonsense: true
        })
        .all()
        .then(function(users) {
          users.length.should.be.above(0);
          users.forEach(function(user) {
            user.name.should.not.equal('NEVER_MATCHES');
            user.nonsense.should.be.true;
          });
          done();
        }, done)
        .done();
    });

    it('should apply the given default values to many records before returning a single column', function(done) {
      this.query
        .select()
        .from('OUser')
        .defaults({
          name: 'NEVER_MATCHES',
          nonsense: true
        })
        .column('nonsense')
        .all()
        .then(function(names) {
          names.length.should.be.above(0);
          names.forEach(function(name) {
            name.should.not.equal('NEVER_MATCHES');
          });
          done();
        }, done)
        .done();
    });
    it('should apply the given default values to many records before returning  2 columns', function(done) {
      this.query
        .select()
        .from('OUser')
        .defaults({
          name: 'NEVER_MATCHES',
          nonsense: true
        })
        .column('name', 'nonsense')
        .all()
        .then(function(users) {
          users.length.should.be.above(0);
          users.forEach(function(user) {
            user.name.should.not.equal('NEVER_MATCHES');
            user.nonsense.should.be.true;
          });
          done();
        }, done)
        .done();
    });
  });

  describe('Db::select()', function() {
    it('should select a user', function(done) {
      this.db.select().from('OUser').where({name: 'reader'}).one()
        .then(function(user) {
          user.name.should.equal('reader');
          done();
        }, done).done();
    });
    it('should select a user with a fetch plan', function(done) {
      this.db.select().from('OUser').where({name: 'reader'}).fetch({roles: 3}).one()
        .then(function(user) {
          user.name.should.equal('reader');
          user.roles.length.should.be.above(0);
          user.roles[0]['@class'].should.equal('ORole');
          done();
        }, done).done();
    });
    it('should select a user with multiple fetch plans', function(done) {
      this.db.select().from('OUser').where({name: 'reader'}).fetch({roles: 3, '*': -1}).one()
        .then(function(user) {
          user.name.should.equal('reader');
          user.roles.length.should.be.above(0);
          user.roles[0]['@class'].should.equal('ORole');
          done();
        }, done).done();
    });
  });
  describe('Db::traverse()', function() {
    it('should traverse a user', function(done) {
      this.db.traverse().from('OUser').where({name: 'reader'}).all()
        .then(function(rows) {
          Array.isArray(rows).should.be.true;
          rows.length.should.be.above(1);
          done();
        }, done).done();
    });
  });

  describe('Db::insert()', function() {
    it('should insert a user', function(done) {
      this.db.insert().into('OUser').set({name: 'test', password: 'testpasswordgoeshere', status: 'ACTIVE'}).one()
        .then(function(user) {
          user.name.should.equal('test');
          done();
        }, done).done();
    });
  });
  describe('Db::update()', function() {
    it('should update a user', function(done) {
      this.db.update('OUser').set({foo: 'bar'}).where({name: 'reader'}).limit(1).scalar()
        .then(function(count) {
          count.should.eql(1);
          done();
        }, done).done();
    });
  });
});