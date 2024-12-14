import express from "express";
import bodyParser from "body-parser";
import pg from "pg";

const app = express();
const port = 3000;

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

let currentUserId = 1;
 let users = [
  // { id: 1, name: "Angela", color: "teal" },
  // { id: 2, name: "Jack", color: "powderblue" },
 ];

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

app.get("/", async (req, res) => {
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
      res.redirect("/");
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
 
  res.redirect("/");
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
  res.redirect("/");
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
    res.redirect("/");
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
