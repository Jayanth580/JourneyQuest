import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import multer from "multer";
import env from "dotenv";


const app = express();
const port = 3000;
env.config();

//uploading file

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    return cb(null, './uploads')
  },
  filename: function (req, file, cb) {
    return cb(null,  `${Date.now()}-${file.originalname}`)
  }
});

const upload=multer({storage});


const db = new pg.Client({
  user: "postgres",
  host: "localhost",
  database: "world",
  password: "9036",
  port: 5433,
});
db.connect();


app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(express.static("uploads"));


let currentUserId = 1;
 let users = [
  // { id: 1, name: "Angela", color: "teal" },
  // { id: 2, name: "Jack", color: "powderblue" },
 ];
 let images=[];
 let ratingsarray=[];
 

async function checkVisisted() {
  const result = await db.query(
    "SELECT country_code FROM visited_countries JOIN users ON users.id = user_id WHERE user_id = $1; ",
    [currentUserId]
  );
  let countries = [];
  result.rows.forEach((country) => {
    countries.push(country.country_code);
  });
  return countries;
}
 async function getcurrentuser(){
  const result=await db.query("SELECT * FROM users");
  users=result.rows;
  console.log(users);
 return users.find((user)=> user.id == currentUserId);
 }

 async function getimages(user_id,country_code) {
  const result=await db.query("SELECT * from image_table where user_id=$1 and country_code=$2",[user_id,country_code]);
  images=result.rows;
  return images;
 }

 async function getratedcountries() {
  const result=await db.query("SELECT * from countries where rating>4");
  ratingsarray=result.rows;
  //console.log(ratingsarray);
  return ratingsarray;
  
 }


 app.get("/",async(req,res)=>{
  res.render("frontend.ejs");
 });
 
 app.get("/images",async (req,res)=>{
   const cratings=await getratedcountries();
  res.render("images.ejs",{
    users:images,
   ratings:cratings,
  });
});

app.get("/login",async(req,res)=>{
  res.render("login.ejs");
});

 app.post("/upload",upload.single("Uploadimage"), async(req,res)=>{
  console.log(req.file);
  const id=req.body["country"];
  const username=req.body["username"];

  try{
        const result=await db.query("SELECT country_code from countries where LOWER(country_name) LIKE $1 || '%' ;",[id.toLowerCase()]);
        const result1=await db.query("SELECT id from users where LOWER(name) LIKE $1 || '%' ;",[username.toLowerCase()]);
      try{
        const data = result.rows[0];
    const countryCode = data.country_code;
    const data1 = result1.rows[0];
    const user_id = data1.id;
    console.log(countryCode);
      await db.query(
        "INSERT INTO image_table (country_code,image,user_id) VALUES ($1, $2,$3)",
        [countryCode,req.file.path,user_id]
      );
    }catch{
      console.log("Not entered in database");
    }
  }
  catch{
          console.log("Country doesn't exist, enter correctly");
  }
  res.redirect("/");
 });



 app.post("/getimages",async(req,res)=>{
  const inputuser=req.body["user"];
  const inputcountry=req.body["country"];
  try{
    const result=await db.query("SELECT country_code from countries where LOWER(country_name) LIKE $1 || '%' ;",[inputcountry.toLowerCase()]);
    const result1=await db.query("SELECT id from users where LOWER(name) LIKE $1 || '%' ;",[inputuser.toLowerCase()]);
  try{
    const data = result.rows[0];
const countryCode = data.country_code;
const data1 = result1.rows[0];
const user_id = data1.id;
   const usersimage=await getimages(user_id,countryCode);
   console.log(usersimage);
   res.render("images.ejs",{
    users:usersimage,
    ratings:ratingsarray,
   });
 }catch{
  console.log("Cannot get the images");
 }
  }catch{
    console.log("User has not visited the country");
  }

 });


app.get("/getstart", async (req, res) => {
  const countries = await checkVisisted();
  const currentuser=await getcurrentuser();
  res.render("index.ejs", {
    countries: countries,
    total: countries.length,
    users: users,
    color: currentuser.color,
  });
});
app.post("/add", async (req, res) => {
  const input = req.body["country"];
 // const cuurentuser=await getcurrentuser();

  try {
    const result = await db.query(
      "SELECT country_code FROM countries WHERE LOWER(country_name) LIKE  $1 || '%' ;",
      [input.toLowerCase()]
    );

    const data = result.rows[0];
    const countryCode = data.country_code;
    try {
      await db.query(
        "INSERT INTO visited_countries (country_code,user_id) VALUES ($1, $2)",
        [countryCode,currentUserId]
      );
      res.redirect("/getstart");
    } catch (err) {
      console.log(err);
      const countries=await checkVisisted();
      const currentuser=await getcurrentuser();
      res.render("index.ejs",{
        countries:countries,
        total:countries.length,
        users: users,
        color: currentuser.color,
        error:"Country is already visited try again.",
      });
    }
  } catch (err) {
    console.log(err);
    const countries=await checkVisisted();
    const currentuser=await getcurrentuser();
      res.render("index.ejs",{
        countries:countries,
        total:countries.length,
        users: users,
        color: currentuser.color,
        error:" country does not exits try again.",
      });
  }
});
app.post("/user", async (req, res) => {
  if(req.body.add==="new")
  {
    res.render("new.ejs");
  }else{
  currentUserId=req.body.user;
  console.log(currentUserId);
 
  res.redirect("/getstart");
  }
});

app.post("/new", async (req, res) => {
  //Hint: The RETURNING keyword can return the data that was inserted.
  //https://www.postgresql.org/docs/current/dml-returning.html

  const newusername=req.body.name;
  const newusercolor=req.body.color;
  const result=await db.query("INSERT INTO users (name,color) VALUES($1,$2) RETURNING *;",[newusername,newusercolor] )
  const id=result.rows[0].id;
  currentUserId=id;
  res.redirect("/getstart");
});

app.post("/delete",async (req,res)=>{
  const input=req.body["country"];
  console.log(input);
  try {
    const result = await db.query(
      "SELECT country_code FROM countries WHERE LOWER(country_name) LIKE  $1 || '%' ;",
      [input.toLowerCase()]
    );

    const data = result.rows[0];
    const countryCode = data.country_code;
  try{
    await db.query("DELETE FROM visited_countries WHERE country_code=$1 AND user_id=$2",[countryCode,currentUserId]);
    res.redirect("/getstart");
  }catch(err){
     console.log(err);
     const countries=await checkVisisted();
     const currentuser=await getcurrentuser();
     res.render("index.ejs",{
       countries:countries,
       total:countries.length,
       users: users,
       color: currentuser.color,
       error:"Country is not visited try again.",
     });
  }
  }catch(err){
    console.log(err);
    console.log(err);
    const countries=await checkVisisted();
    const currentuser=await getcurrentuser();
      res.render("index.ejs",{
        countries:countries,
        total:countries.length,
        users: users,
        color: currentuser.color,
        error:" country does not exits try again.",
      });
  }
});




app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
