"use strict";
 const request = require("request");
exports.deleteModel = LoadDeleteObject;

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

 var model= []
 var url='http://services.odata.org/TripPinRESTierService/(S(bm2bgnnmqjwlvj4gs5qe3u13))/People';
 let res = await apiGetRequest(url);

 var data= JSON.parse(res);

 for(var i=0; i<data.value.length; i++)             
 {
  console.dir(data.value[i].UserName);
  model.push(data.value[i].UserName);
 }
console.log(model);

return model;
 

}
 LoadDeleteObject();