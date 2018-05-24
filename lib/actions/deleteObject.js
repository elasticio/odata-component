"use strict";
 const request = require("request");
exports.deleteModel = LoadDeleteObject;

 function LoadDeleteObject()
{
    var model= [];
    var data = {};

     request("http://services.odata.org/TripPinRESTierService/(S(bm2bgnnmqjwlvj4gs5qe3u13))/People", (error, response, body) => {
         if(error) {

            data= error;
         }

         data= JSON.parse(body);
         model=data.value;
       
    //    for(var i=0; i<model.length; i++)             
    //     {
    //           console.log(model[i].UserName);
           
    //     }

    });
return model;
       
   
}
//  function test()
// {

//  LoadDeleteObject();


// }
//  test();
