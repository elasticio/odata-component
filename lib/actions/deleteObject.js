"use strict";
 const request = require("request");
 var model=[];
//  exports.process = deleteObject;
exports.deleteModel = LoadDeleteObject;

function  LoadDeleteObject()
{
    var data = {};

    request("http://services.odata.org/TripPinRESTierService/(S(bm2bgnnmqjwlvj4gs5qe3u13))/People", (error, response, body) => {
         if(error) {
            model= error;
         }
         data= JSON.parse(body);
        // console.dir(data);  


        model= data.value;

       // var k = data.value.length;
      // console.log(data.value);


        // for(var i=0; i<data.value.length; i++)             
        // {
        //     console.dir(data.value[i].FirstName);
        // }
    });
        return model;
}
// function  test()
// {

// LoadDeleteObject();

// }
//  test();
// function deleteObject()
// {
//   var Request = require("request");
//   Request("http://services.odata.org/TripPinRESTierService/(S(bm2bgnnmqjwlvj4gs5qe3u13))/People('russellwhyte')", (error, response, body) => {
//      if(error) {
//         return console.dir(error);
//      }
//      getObjects:JSON.parse(body);

//      console.dir(JSON.parse(body));
//   });
// }
// function getMetaModel(seletedvalue)
// {

//     var  model = {};
    
//     request("http://services.odata.org/TripPinRESTierService/(S(bm2bgnnmqjwlvj4gs5qe3u13))/People('"+seletedvalue+"')", (error, response, body) => {
//          if(error) {
         
//             model=error;
//             //  return console.dir(error);
//          }
//          model:JSON.parse(body);
    
//          console.dir(JSON.parse(body));
//       });
// return model;

// }
