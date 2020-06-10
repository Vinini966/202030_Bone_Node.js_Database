if(process.env.NODE_ENV === "production"){
    module.exports ={
        //connection to cloud mongodb server 
        mongoURI:"mongodb+srv://admin:Blender5!@webapi-mfv11.mongodb.net/202030_Bone?retryWrites=true&w=majority"
    }
}
else{
    module.exports ={
        mongoURI:"mongodb+srv://admin:Blender5!@webapi-mfv11.mongodb.net/202030_Bone?retryWrites=true&w=majority"
    }
}