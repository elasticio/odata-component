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

For the local testing (e.g. spec-integration) the following environment variables are required:
* `RESOURCE_SERVER_URL`
* `CONTACT_TO_LOOKUP_FIRST_NAME`
* `CONTACT_TO_LOOKUP_ID`

## Version and compatibility information
This component interacts with OData version 4.  It has been
tested with the [OData TripPin Reference Service](http://www.odata.org/odata-services/).

[npm-image]: https://badge.fury.io/js/odata-component.svg
[npm-url]: https://npmjs.org/package/odata-component
[travis-image]: https://travis-ci.org/elasticio/odata-component.svg?branch=master
[travis-url]: https://travis-ci.org/elasticio/odata-component
[daviddm-image]: https://david-dm.org/elasticio/odata-component.svg?theme=shields.io
[daviddm-url]: https://david-dm.org/elasticio/odata-component
