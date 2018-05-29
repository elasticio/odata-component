# OData Component
[![NPM version][npm-image]][npm-url]
[![Travis Build Status][travis-image]][travis-url]
[![DependencyStatus][daviddm-image]][daviddm-url]

OData with OAuth component for the [elastic.io platform](http://www.elastic.io).

A component designed to work with generic APIs which implement the [OData v4
specification](http://www.odata.org).

# Authentication
Supports the following forms:
* No Auth
* Basic Auth
* API key auth

# Triggers
## Get Objects Polling 
Get objects which have recently been modified or created.

All Objects Programmatically Detectable Covered.  Time range options not
supported, Standardized `isNew`,`createdOn` and `modifiedOn` not included in
output.

# Actions
## Lookup Object by Field(s)
Given a set of criteria which matches exactly one record, find that matching record.

All Objects Programmatically Detectable Covered. Requires a sample object to
exist to infer schema. Shows all fields, not just unique fields.  Does not
necessarily understand type for field.

## Upsert Object By ID
Update an existing entry if the id provided.  Otherwise create a new entry.

All Objects Programmatically Detectable Covered. Requires a sample object to
exist to infer schema.  Does not inform following components if new.

# Configuration Info
## Required environment variables
No environment variables are required for deployment.

## Version and compatibility information
This component interacts with OData version 4.  It has been
tested with the [OData TripPin Reference Service](http://www.odata.org/odata-services/).

[npm-image]: https://badge.fury.io/js/odata-component.svg
[npm-url]: https://npmjs.org/package/odata-component
[travis-image]: https://travis-ci.org/elasticio/odata-component.svg?branch=master
[travis-url]: https://travis-ci.org/elasticio/odata-component
[daviddm-image]: https://david-dm.org/elasticio/odata-component.svg?theme=shields.io
[daviddm-url]: https://david-dm.org/elasticio/odata-component

# Development Information
## OData TripPin Sample Service
The OData consortium has created a sample OData service called TripPin.  The
integration tests for this repo are designed to run against this service.  This
service has numerous bugs and some of the checks that would normally be tested
has to be reduced in these unit tests.

Resources
* [TripPin Intro](http://www.odata.org/blog/trippin-new-odata-v4-sample-service/)
* [TripPin Sample Calls](http://www.odata.org/odata-services/)
* [Request A Key To Identify Yourself to Trippin](http://www.odata.org/odata-services/service-usages/request-key-tutorial/)

## Running Integration Tests
For the local testing (e.g. spec-integration) the following environment variables are required:
* `RESOURCE_SERVER_URL` - Obtain a sample TripPin key and place the provided URL with key into this variable
* `CONTACT_TO_LOOKUP_FIRST_NAME` - Sample contact name to lookup
* `CONTACT_TO_LOOKUP_ID` - Sample contact id to lookup

These environment variables must be placed in a [`.env`
file](https://www.npmjs.com/package/dotenv).  The integration tests can be run
through npm with the cli command `npm run integration-test` or by the mocha test
running capabilities of your IDE.  The integration tests are located in `spec-integration`.

### Example .env file
*(Replace `<IncludeYourKeyHere>` with a valid key)*
```
RESOURCE_SERVER_URL="http://services.odata.org/TripPinRESTierService/(S(<IncludeYourKeyHere>))/"
CONTACT_TO_LOOKUP_FIRST_NAME=Russell
CONTACT_TO_LOOKUP_ID=russellwhyte
```
