"use strict";
 const request = require("request");
 const model= [];

exports.deleteModel = LoadDeleteObject;

//  function LoadDeleteObject()
// {
  
//     var data = {};

//    return  request("http://services.odata.org/TripPinRESTierService/(S(bm2bgnnmqjwlvj4gs5qe3u13))/People", (error, response, body) => {
//          if(error) {

//          return   data= error;
//          }

//          data= JSON.parse(body);
//         return model=data.value;
        
//     //    for(var i=0; i<model.length; i++)             
//     //     {
//     //           console.log(model[i].UserName);
           
//     //     }

//     });

// }


function apiGetRequest(url) {
 return new Promise(function (resolve, reject) {
   request(url, function (error, res, body) {
     if (!error && res.statusCode == 200) {
       resolve(body);
     } else {
       reject(error);
     }
   });
 });
}

async function LoadDeleteObject() {
 var url='http://services.odata.org/TripPinRESTierService/(S(bm2bgnnmqjwlvj4gs5qe3u13))/People';
 let res = await apiGetRequest(url);

console.log(res);

return res;
 

}
// async function test()
// {

//  var d = await webAPIGetRequest();
// console.log(d);


// }
//  test();
