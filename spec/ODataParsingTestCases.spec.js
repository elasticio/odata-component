const { expect } = require('chai');
const fs = require('fs');
const { getJsonSchemaForEntitySet } = require('../lib/commons/odata/extractCsdl');

describe('OData Parsing Test Cases', () => {
  it('TripPin Person Schema', async () => {
    const csdlString = fs.readFileSync('./samples/rawCsdlFiles/TripPinMetadata.xml').toString();

    const convertedResults = await getJsonSchemaForEntitySet(csdlString, 'People');
    const { properties } = convertedResults;

    expect(properties.UserName).to.deep.include({
      type: 'string',
      required: false,
      title: 'UserName (Primary Key)',
    });
    expect(properties.FirstName).to.deep.include({
      type: 'string',
      required: true,
      title: 'FirstName',
    });
    expect(properties.LastName).to.deep.include({
      type: 'string',
      required: false,
      title: 'LastName',
    });
    expect(properties.MiddleName).to.deep.include({
      type: 'string',
      required: false,
      title: 'MiddleName',
    });
    expect(properties.Gender).to.deep.include({
      type: 'string',
      required: true,
      enum: ['Male', 'Female', 'Unknow'],
      title: 'Gender',
    });
    expect(properties.Age).to.deep.include({
      type: 'number',
      required: false,
      title: 'Age',
    });
    expect(properties.Emails).to.deep.include({
      type: 'array',
      items: {
        type: 'string',
      },
      required: false,
      title: 'Emails',
    });

    expect(properties.FavoriteFeature).to.deep.include({
      type: 'string',
      required: true,
      enum: ['Feature1', 'Feature2', 'Feature3', 'Feature4'],
      title: 'FavoriteFeature',
    });

    expect(properties.Features).to.deep.include({
      type: 'array',
      required: true,
      items: {
        type: 'string',
        enum: ['Feature1', 'Feature2', 'Feature3', 'Feature4'],
      },
      title: 'Features',
    });

    // eslint-disable-next-line no-unused-expressions
    expect(properties.BestFriend.required).to.be.false;
  });

  it('MS Business Central Contact Schema', async () => {
    const csdlString = fs.readFileSync('./samples/rawCsdlFiles/MsBusinessCentralWithCustomerCardService.xml').toString();

    const convertedResults = await getJsonSchemaForEntitySet(csdlString, 'CustomerCardService');
    const { properties } = convertedResults;

    // eslint-disable-next-line no-unused-expressions
    expect(properties.No.required).to.be.false;
  });
});
