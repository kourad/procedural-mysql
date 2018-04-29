# PROCEDURAL MYSQL

CLI to make more easy write functions on mysql and uploads to mysql server

## Installation

```bash
    npm install -g procedural-mysql
```

The configuration file is on the root project folder and it's called *procedural-mysql.config.json*

## config file
```js
{
    "directory": "sql",
    "db": {
        "user": "root",
        "host": "localhost",
        "database": "test",
        "password": "root",
        "charset": "utf8"
    }
}
```

## Basic usage
```bash
    procedural-mysql -c config.json # sets the configuration file
    procedural-mysql -w  # watch in config directory for changes
    procedural-mysql -w -g  # upload all functions in config directory and watch cahnges on it
    procedural-mysql -h # shows all commands to upload files
```

## A basic mySQL function
```mysql
CREATE FUNCTION test (number int) RETURNS int 
BEGIN
    return number;
END
```

