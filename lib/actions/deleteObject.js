"use strict";
 const request = require("request");
 var model=[];
//  exports.process = deleteObject;
exports.deleteModel = LoadDeleteObject;

async function LoadDeleteObject()
{
    // var data = {};

    //   await request.get("http://services.odata.org/TripPinRESTierService/(S(bm2bgnnmqjwlvj4gs5qe3u13))/People").then(function(result){

    //     data= JSON.parse(result);
    //     console.dir(data);  
  


      var url='http://services.odata.org/TripPinRESTierService/(S(bm2bgnnmqjwlvj4gs5qe3u13))/People';
        
        await request(url,function(error, response, body){
            
        if(!error)
        {
        model=JSON.parse(body);
          console.log(model);
          return model;
        }

       });
   


   // }
       
   
    //   model= data.value;
    //   console.log(model);

       // var k = data.value.length;
      // console.log(data.value);


        // for(var i=0; i<data.value.length; i++)             
        // {
        //     console.dir(data.value[i].FirstName);
        // }
 
       // return model;
}
//  function test()
// {

// var d=  await LoadDeleteObject();
// console.log(d);

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
