var path = require('path'),
	dbSessionId = -1,
	dataCluster = -1,
	dataSegment = -1,
	serverCluster = {},
	recordId = null;

// @fixme these tests are extremely co-dependent
// if you get a load of test errors, fix the first one first!

describe("Database Operations", function () {
  describe('db-create', function () {
    it('should create a database', function (done) {
      TEST_SERVER.send('db-create', {
        name: 'testdb_tmp',
        storage: 'memory',
        type: 'document',
        username: TEST_SERVER_CONFIG.username,
        password: TEST_SERVER_CONFIG.password
      })
      .then(function (response) {
        done();
      })
      .catch(function (e) {
        done(e || 'ERRR');
      })
      .done();
    });
  });
  describe('db-list', function () {
    it("should return a list of databases", function (done) {
      TEST_SERVER.send('db-list')
      .then(function (response) {
        Object.keys(response.databases).length.should.be.above(0);
        done();
      }, done).done();
    })
  });
  describe('db-exists', function () {
    it("should return false for missing databases", function (done) {
      TEST_SERVER.send('db-exists', {
        name: 'a_non_existant_database',
        storage: 'memory'
      })
      .then(function (response) {
        response.exists.should.be.false;
        done();
      }, done)
      .done();
    });
    it("should return true for existing databases", function (done) {
      TEST_SERVER.send('db-exists', {
        name: 'testdb_tmp',
        storage: 'memory'
      })
      .then(function (response) {
        response.exists.should.be.true;
        done();
      }, done)
      .done();
    });
  });
  describe('db-open', function () {
    it("should open a database", function (done) {
      TEST_SERVER.send('db-open', {
        sessionId: -1,
        name: 'testdb_tmp',
        type: 'document',
        username: 'admin',
        password: 'admin'
      })
      .then(function (response) {
        response.sessionId.should.be.above(0);
        response.sessionId.should.not.equal(TEST_SERVER.sessionId);
        response.totalClusters.should.be.above(0);
        response.clusters.length.should.equal(response.totalClusters);
        dbSessionId = response.sessionId;
        serverCluster = response.serverCluster;
        done();
      }, done)
      .done();
    });
  });
  describe('db-size', function () {
    it("should get the size of a database", function (done) {
      TEST_SERVER.send('db-size', {
        sessionId: dbSessionId
      })
      .then(function (response) {
        response.size.should.be.above(0);
        done();
      }, done)
      .done();
    });
  });
  describe('db-countrecords', function () {
    it("should get the number of records in a database", function (done) {
      TEST_SERVER.send('db-countrecords', {
        sessionId: dbSessionId
      })
      .then(function (response) {
        response.count.should.be.above(0);
        done();
      }, done)
      .done();
    });
  });
  describe('db-reload', function () {
    it("should reload the data for a database", function (done) {
      TEST_SERVER.send('db-reload', {
        sessionId: dbSessionId
      })
      .then(function (response) {
        response.totalClusters.should.be.above(0);
        response.clusters.length.should.equal(response.totalClusters);
        done();
      }, done)
      .done();
    });
  });
  describe('datacluster-add', function () {
    it("should add a data cluster", function (done) {
      TEST_SERVER.send('datacluster-add', {
        sessionId: dbSessionId,
        location: 'physical',
        name: 'testcluster'
      })
      .then(function (response) {
        response.id.should.be.above(0);
        dataCluster = response.id;
        done();
      }, done)
      .done();
    });
  });
  describe('record-create', function () {
    it("should create a record", function (done) {
      TEST_SERVER.send('record-create', {
        sessionId: dbSessionId,
        cluster: 1,
        record: {
          name: 'Charles',
          email: 'charles@codemix.com'
        }
      })
      .then(function (response) {
        response.position.should.be.above(-1);
        response.version.should.be.above(-1);
        recordId = new LIB.RID({
          cluster: 1,
          position: response.position
        })
        done();
      }, done)
      .done();
    });
  });
  describe('command', function () {
    it("should execute a query command", function (done) {
      TEST_SERVER.send('command', {
        sessionId: dbSessionId,
        class: 'com.orientechnologies.orient.core.sql.query.OSQLSynchQuery',
        limit: 2,
        query: 'SELECT * FROM OUser',
        mode: 's'
      })
      .then(function (response) {
        response.results.length.should.equal(1); // wrapper
        response.results[0].type.should.equal('l'); // collection
        response.results[0].content.length.should.equal(2); // real results
        done();
      }, done).done();
    });
    it("should execute a create class command", function (done) {
      TEST_SERVER.send('command', {
        sessionId: dbSessionId,
        class: 'com.orientechnologies.orient.core.sql.OCommandSQL',
        query: 'CREATE CLASS TestClass',
        mode: 's'
      })
      .then(function (response) {
        response.should.have.property('results');
        done();
      }, done).done();
    });
  });
  describe('record-metadata', function () {
    it("should retreive the metadata for a record", function (done) {
      TEST_SERVER.send('record-metadata', {
        sessionId: dbSessionId,
        cluster: recordId.cluster,
        position: recordId.position
      })
      .then(function (response) {
        response.version.should.be.above(-1);
        done();
      }, done)
      .done();
    });
  });
  describe('record-load', function () {
    it("should load a record", function (done) {
      TEST_SERVER.send('record-load', {
        sessionId: dbSessionId,
        cluster: recordId.cluster,
        position: recordId.position
      })
      .then(function (response) {
        response.records.length.should.equal(1);
        response.records[0]['@version'].should.be.above(-1);
        done();
      }, done)
      .done();
    });
    it("should load a record with a fetch plan", function (done) {
      TEST_SERVER.send('record-load', {
        sessionId: dbSessionId,
        cluster: 5,
        position: 0,
        fetchPlan: '*:-1'
      })
      .then(function (response) {
        response.records.length.should.be.above(1);
        done();
      }, done)
      .done();
    });
  });
  describe('record-update', function () {
    it("should update a record", function (done) {
      TEST_SERVER.send('record-update', {
        sessionId: dbSessionId,
        cluster: recordId.cluster,
        position: recordId.position,
        record: {
          name: 'Charles P'
        }
      })
      .then(function (response) {
        response.version.should.be.above(0);
        done();
      }, done)
      .done();
    });
  });

	describe('record-clean-out', function () {
		it.skip("should clean-out a record", function (done) {
			TEST_SERVER.send('record-clean-out', {
				sessionId: dbSessionId,
				cluster: recordId.cluster,
				position: recordId.position,
			})
				.then(function (response) {
					response.success.should.be.true;
					done();
				}, done)
				.done();
		});
	});
	describe('record-delete', function () {
		it("should delete an existing record", function (done) {
			TEST_SERVER.send('record-delete', {
				sessionId: dbSessionId,
				cluster: recordId.cluster,
				position: recordId.position,
			})
				.then(function (response) {
					response.success.should.be.true;
					done();
				}, done)
				.done();
		});
		it("should not delete a missing record", function (done) {
			TEST_SERVER.send('record-delete', {
				sessionId: dbSessionId,
				cluster: recordId.cluster,
				position: recordId.position + 9999,
			})
				.then(function (response) {
					response.success.should.be.false;
					done();
				}, done)
				.done();
		});
	});
	describe('datacluster-count', function () {
		it("should count records in a data cluster", function (done) {
			TEST_SERVER.send('datacluster-count', {
				sessionId: dbSessionId,
				id: dataCluster
			})
				.then(function (response) {
					response.count.should.equal(0);
					done();
				}, done)
				.done();
		});
	});
	describe('datacluster-datarange', function () {
		it("should get the range of record ids in a data cluster", function (done) {
			TEST_SERVER.send('datacluster-datarange', {
				sessionId: dbSessionId,
				id: dataCluster
			})
				.then(function (response) {
					response.begin.should.equal(-1);
					response.end.should.equal(-1);
					done();
				}, done)
				.done();
		});
	});
	describe('datacluster-drop', function () {
		it("should remove a data cluster", function (done) {
			TEST_SERVER.send('datacluster-drop', {
				sessionId: dbSessionId,
				id: dataCluster
			})
				.then(function (response) {
					response.should.have.property('success');
					done();
				}, done)
				.done();
		});
	});
	describe('datasegment-add', function () {
		it("should add a data segment", function (done) {
			TEST_SERVER.send('datasegment-add', {
				sessionId: dbSessionId,
				location: '/tmp',
				name: 'test_segment'
			})
				.then(function (response) {
					done();
				}, done)
				.done();
		});
	});

	describe('db-close', function () {
		it("should close a database", function (done) {
			TEST_SERVER.send('db-close', {
				sessionId: dbSessionId
			})
				.then(function (response) {
					done();
				}, done)
				.done();
		});
	});
	describe('db-delete', function () {
		it('should delete a database', function (done) {
			TEST_SERVER.send('db-delete', {
				name: 'testdb_tmp',
				storage: 'memory',
				username: TEST_SERVER_CONFIG.username,
				password: TEST_SERVER_CONFIG.password
			})
				.then(function (response) {
					done();
				})
				.catch(function (e) {
					done(e || 'ERRR');
				})
				.done();
		});
	})
});