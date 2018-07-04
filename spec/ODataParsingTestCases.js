'use strict';

const expect = require('chai').expect;
const fs = require('fs');
const {getJsonSchemaForEntitySet} = require('../lib/commons/odata/extractCsdl');

describe('OData Parsing Test Cases', function Dummy() {
  it('TripPin Person Schema', async function () {
    const csdlString = fs.readFileSync('./spec/samples/rawCsdlFiles/TripPinMetadata.xml').toString();

    const convertedResults = await getJsonSchemaForEntitySet(csdlString, 'People');
    const properties = convertedResults.properties;

    expect(properties.UserName).to.deep.include({
      type: 'string',
      required: true,
      title: 'UserName'
    });
    expect(properties.FirstName).to.deep.include({
      type: 'string',
      required: true,
      title: 'FirstName'
    });
    expect(properties.LastName).to.deep.include({
      type: 'string',
      required: false,
      title: 'LastName'
    });
    expect(properties.MiddleName).to.deep.include({
      type: 'string',
      required: false,
      title: 'MiddleName'
    });
    expect(properties.Gender).to.deep.include({
      type: 'string',
      required: true,
      enum: ['Male', 'Female', 'Unknow'],
      title: 'Gender'
    });
    expect(properties.Age).to.deep.include({
      type: 'number',
      required: false,
      title: 'Age'
    });
    expect(properties.Emails).to.deep.include({
      type: 'array',
      items: {
        type: 'string'
      },
      required: false,
      title: 'Emails'
    });
    expect(properties.AddressInfo).to.deep.include({
      type: 'array',
      items: {
        type: 'object',
        properties: {
          Address: {
            type: 'string',
            required: false,
            title: 'Address'
          },
          City: {
            type: 'object',
            required: false,
            title: 'City',
            properties: {
              Name: {
                type: 'string',
                required: false,
                title: 'Name'
              },
              CountryRegion: {
                type: 'string',
                required: false,
                title: 'CountryRegion'
              },
              Region: {
                type: 'string',
                required: false,
                title: 'Region'
              }
            }
          }
        }
      },
      required: false,
      title: 'AddressInfo'
    });

    expect(properties.HomeAddress).to.deep.include({
      type: 'object',
      properties: {
        Address: {
          type: 'string',
          required: false,
          title: 'Address'
        },
        City: {
          type: 'object',
          required: false,
          title: 'City',
          properties: {
            Name: {
              type: 'string',
              required: false,
              title: 'Name'
            },
            CountryRegion: {
              type: 'string',
              required: false,
              title: 'CountryRegion'
            },
            Region: {
              type: 'string',
              required: false,
              title: 'Region'
            }
          }
        }
      },
      required: false,
      title: 'HomeAddress'
    });

    expect(properties.FavoriteFeature).to.deep.include({
      type: 'string',
      required: true,
      enum: ['Feature1', 'Feature2', 'Feature3', 'Feature4'],
      title: 'FavoriteFeature'
    });

    expect(properties.Features).to.deep.include({
      type: 'array',
      required: true,
      items: {
        type: 'string',
        enum: ['Feature1', 'Feature2', 'Feature3', 'Feature4']
      },
      title: 'Features'
    });
  });
});
