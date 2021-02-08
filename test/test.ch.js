'use strict';

var SepaXML = require('../index');
var expect = require('chai').expect;
const fs = require("fs");
const path = require("path");

describe('Module loads a new function', function() {
  it('Object `SepaXML` is a function', function() {
    expect(SepaXML).to.be.a('function');
  });
});

describe('Use pain.001.001.03.ch format', function () {
  var defaultsepaxml = new SepaXML("pain.001.001.03.ch");

  it('should be `pain.001.001.03.ch` format', function () {
    expect(defaultsepaxml.outputFormat).to.be.equal('pain.001.001.03.ch');
  });
});

describe('Works with the `pain.001.001.03.ch` format', function() {
  var sepaxml = new SepaXML('pain.001.001.03.ch', true);
  sepaxml.setHeaderInfo({
    messageId: 'ABC123',
    initiator: 'SepaXML'
  });

  sepaxml.setPaymentInfo({
    id: `202012`,
    method: 'TRF',
    senderName: 'SENDER_NAME',
    senderIBAN: 'NL21ABNA0531621583',
    senderProprietary: 'CWD',
    batchBooking: true,
    bic: 'ABNANL2A',
    date: "2021-02-10",
  });

  sepaxml.addTransaction({
    id: `202012/1`,
    batchBooking: true,
    date: "2021-02-01",
    ccy: "CHF",
    amount: .1,
    creditorName: "pippo",
    creditorAddress: {
      // TODO:
      street: "Via della lasagna",
      number: "13",
      postalCode: "6900",
      city: "Lugano",
      country: "CH"
    },
    creditorIban: "CH2180808003528517122" //TODO:
  });

  sepaxml.addTransaction({
    id: `202012/2`,
    batchBooking: true,
    date: "2021-02-01",
    ccy: "CHF",
    amount: 40.2,
    creditorName: "pluto",
    creditorAddress: {
      // TODO:
      street: "Via della lasagna",
      number: "13",
      postalCode: "6900",
      city: "Lugano",
      country: "CH"
    },
    creditorIban: "CH2180808003528517122" //TODO:
  });

  it('Loads the template for the format', function(done) {
    sepaxml.compile(function (err, out) {
      expect(err).to.be.null;
      expect(out).to.be.a('string');

      fs.writeFileSync(path.join(__dirname, "../dist/pain.001.001.03.ch.xml"), out);

      done();
    });
  });

  it('should autofill BIC', function () {
    expect(sepaxml._payments.info.bic).to.be.eql('ABNANL2A');
  });

  it('should made transaction Control Sum', function () {
    expect(sepaxml._header.transactionCount).to.be.equal(2);
    expect(sepaxml._header.transactionControlSum).to.be.equal('40.30');

    expect(sepaxml._payments.info.transactionCount).to.be.equal(2);
    expect(sepaxml._payments.info.transactionControlSum).to.be.equal('40.30');
  });

  describe('Validations', function () {
    it('should return validation', function(done) {
      var emptySepa = new SepaXML('pain.001.001.03');

      emptySepa.compile(function (err, out) {
        expect(out).to.be.undefined;
        expect(err).to.be.eql([
          'You have not filled in the `messageId`.',
          'You have not filled in the `initiator`.',
          'You have not filled in the `id`.',
          'You have not filled in the `method`.',
          'The list of transactions is empty.'
        ]);

        done();
      });
    });

    it('should validate new transaction', function () {
      expect(sepaxml.addTransaction()).to.be.false;
      expect(sepaxml._payments.transactions.length).to.be.equal(2);
    });

    it('should use a bad format', function (done) {
      var badformatsepaxml = new SepaXML('pain.001.001.04');
      badformatsepaxml.setHeaderInfo({
        messageId: 'ABC123',
        initiator: 'SepaXML'
      });

      badformatsepaxml.setPaymentInfo({
        id: 'XYZ987',
        method: 'TRF'
      });

      badformatsepaxml.addTransaction({
        id: 'TRANSAC1',
        iban: 'NL21ABNA0531621583', // fake IBAN from https://www.generateiban.com/test-iban/ thanks
        name: 'generateiban',
        amount: 42
      });

      badformatsepaxml.compile(function (err) {
        expect(err).to.be.exist;
        expect(err.code).to.be.equal('ENOENT');

        done();
      });
    });
  });
});
