#!/usr/bin/env node

const path = require( "path" )
const fs = require( "fs" )
const mysql = require("mysql");
const version = "0.2.0"


const help = `
npm run sql commands:

npm run sql [options] [file]
--------------------------




[options]
  help                Muestra la ayuda
  all                 Sube todos los ficheros al directorio
  w                   Habilita el perseguir archivos o directorios

[file]              archivo a subir 
`


let running = false
let options = {
    config: 'procedural-mysql.config.json',     // archivo de configuracion por defecto
    file: '',           // sube un solo archivo
    generate: false,    // sube todos los archivos del directorio
    remove: false,      // elimina una funcion
    watch: false,       // observa un archivo o directorio
}


/**
 * Funcion que llama a la BD.
 * 
 * @param {string} sql - SQL  ejecutar
 * @return {Promise}
 */
function makeQuery(sql)
{
    return new Promise( ( resolve, reject ) => 
    {
        connection.getConnection( (err, conex) => 
        {
            conex.query(sql, undefined, (err, rows, fields) => 
            {
                if( err ) return reject(err);
                conex.release();
                resolve({rows, fields})
            })
        })
    } )
}

// command:
// mysql -u cegomdbh -h 62.99.130.224 -p usrdb_cegomdbh_doctorsgate < <file>

/**
 * Metodo que recibe una ruta lee la funcion asociada y la sube a la BD
 * @param {string} route 
 * @return {Promise}
 */
async function uploadSQL( route )
{
    let file = fs.readFileSync( route, 'utf8' )
    let match = file.match(/FUNCTION ([\w]+)/m)
    let drop_sql = `DROP FUNCTION IF EXISTS ${match[1]};` 
    await makeQuery( drop_sql )
    await makeQuery( file )
}

/**
 * Metodo que observa un directorio y confirma los cambios
 * @param {string} directory 
 */
function directoryWatcher( directory )
{
    fs.watch( directory, (event, fileName) => 
    {
        if( event === 'change' && !running )
        {
            running = true;
            console.log( 'Running...' )
    
    
            uploadSQL( path.join(directory, fileName) )
            .then( () => 
            {
                running = false;
                let d = new Date()
                console.log( `[${d.getHours()}:${d.getMinutes()}:${d.getSeconds()}] ${fileName}: [\x1b[32mSUCCESS!!\x1b[0m]` )
            } )
            .catch( (error) => {
                running = false;
                let d = new Date()
                console.log( `[${d.getHours()}:${d.getMinutes()}:${d.getSeconds()}] ${fileName}: [\x1b[31mFAIL\x1b[0m]` )
                console.log('\n----------------------------\n')
                console.log(error)
                console.log('\n----------------------------\n')
            } )
    
        }
    } )
    console.log( 'Watching directory: [\x1b[32m%s\x1b[0m]', dir )
}



/**
 * Metodo que observa un fichero y confirma los cambios
 * @param {string} fileName 
 */
function fileWatcher( fileName )
{
    fs.watchFile( fileName, {interval: 100},(current, previous) => 
    {
        if( !running )
        {
            running = true;
            console.log( 'Running...' )
    
    
            uploadSQL( fileName )
            .then( () => 
            {
                running = false;
                let d = new Date()
                console.log( `[${d.getHours()}:${d.getMinutes()}:${d.getSeconds()}] ${fileName}: [\x1b[32mSUCCESS!!\x1b[0m]` )
            } )
            .catch( (error) => {
                running = false;
                let d = new Date()
                console.log( `[${d.getHours()}:${d.getMinutes()}:${d.getSeconds()}] ${fileName}: [\x1b[31mFAIL\x1b[0m]` )
                console.log('\n----------------------------\n')
                console.log(error)
                console.log('\n----------------------------\n')
            } )
    
        }
    } )
    console.log( 'Watching file: [\x1b[32m%s\x1b[0m]', fileName )
}





/**
 * Metodo que captura los argumentos pasados y decide como debe ejecutarse
 * @param {array} args 
 */
function captureArgs( args )
{
    try
    {
        args = args.slice(2)   
        let i = 0;
        let l = args.length;
        for( i; i < l; i++ )
        {
            switch( args[i] )
            {
                case '-h':
                    console.log( help )
                    process.exit();
                    return;
                case '-v':
                    console.log(version)
                    process.exit();
                    return;
                case '-w':
                    if( args.includes('-rm') )
                        throw {code: '-w'}
                    options.watch = true;
                    break;
                case '-c':
                    if( !args[i+1].endsWith('.json') )
                        throw { code: 'c' }
                    options.config = args[i+1];
                    break;
                case '-g':
                    if( args.includes('-rm') )
                        throw {code: '-g'}
                    options.generate = true;
                    break;
                case '-rm':
                    if( args.includes('-g') || args.includes('-w') )
                        throw {code: '-rm'}
                    options.remove = true;
                    break;
                default:
                    if( !args[i].endsWith('.sql') && !args[i].endsWith('.json') ) 
                        throw { code: 'file'}
                    if( args[i].endsWith('.sql') )
                        options.file = args[i];
                    break;
            }
        }
        

        
    }
    catch(error)
    {
        console.log( 'Error: ', error.code )
        process.exit()
    }
    
}




/**
 * uploads all files in directory
 * @param {*} directory 
 */
async function uploadAll( directory )
{
    let files = fs.readdirSync(directory)
    let i = 0;
    let l = files.length;
    
    console.log( 'Running...' )
    
    for( i; i<l; i++ )
    {
        await uploadSQL( path.join( directory, files[i] ) )
        let d = new Date()
        console.log( `[${d.getHours()}:${d.getMinutes()}:${d.getSeconds()}] ${files[i]}: [\x1b[32mSUCCESS!!\x1b[0m]` )
    }
}







/**************************************************************************************************************************
 *                                           INICIO DE LA LOGICA                                                          *
 **************************************************************************************************************************/

captureArgs( process.argv )






const dir_config = path.join( __dirname, options.config )
const config = JSON.parse( fs.readFileSync( dir_config,  'utf8') );
const dir = path.join(__dirname, '../', config.directory)
const connection = mysql.createPool(config.db); 
console.log( 'Config loaded from: [\x1b[32m%s\x1b[0m]', dir_config )



/**
 * Sube un archivo y puede seguirlo despues
 */
if( options.file !== '' && !options.generate )
{
    uploadSQL( path.join( dir, options.file ) )
    .then( () => 
    {
        let d = new Date()
        console.log( `[${d.getHours()}:${d.getMinutes()}:${d.getSeconds()}] ${options.file}: [\x1b[32mSUCCESS!!\x1b[0m]\n\n` )

        if( options.watch )
        {
            fileWatcher( path.join( dir, options.file ) )
        }
        else
            process.exit();
    } )
    .catch( (error) => 
    {
        let d = new Date()
        console.log( `[${d.getHours()}:${d.getMinutes()}:${d.getSeconds()}] ${options.file}: [\x1b[31mFAIL\x1b[0m]` )
        console.log('\n----------------------------\n')
        console.log(error)
        console.log('\n----------------------------\n')
    } )
}

/**
 * Genera todos los archivos y observa uno en concreto
 */
if( options.file !== '' && options.generate && options.watch)
{
    uploadAll( dir )
    .then( () => 
    {
        let d = new Date()
        console.log( `[${d.getHours()}:${d.getMinutes()}:${d.getSeconds()}]: [\x1b[32mALL LOADED SUCCESSFULLY!!\x1b[0m]\n\n` )
        
        if( options.watch )
        {
            fileWatcher( path.join( dir, options.file ) )
        }
        else
            process.exit();
    } )
    .catch( (error) => 
    {
        let d = new Date()
        console.log( `[${d.getHours()}:${d.getMinutes()}:${d.getSeconds()}] ${fileName}: [\x1b[31mFAIL\x1b[0m]` )
        console.log('\n----------------------------\n')
        console.log(error)
        console.log('\n----------------------------\n')
    } )
}

/**
 * Genera todos los archivos y observa el directorio
 */
if( options.file === '' && options.generate && options.watch )
{
    uploadAll( dir )
    .then( () => 
    {
        let d = new Date()
        console.log( `[${d.getHours()}:${d.getMinutes()}:${d.getSeconds()}]: [\x1b[32mALL LOADED SUCCESSFULLY!!\x1b[0m]\n\n` )
        
        if( options.watch )
        {
            directoryWatcher(dir)
        }
        else
            process.exit();
    } )
    .catch( (error) => 
    {
        let d = new Date()
        console.log( `[${d.getHours()}:${d.getMinutes()}:${d.getSeconds()}] ${fileName}: [\x1b[31mFAIL\x1b[0m]` )
        console.log('\n----------------------------\n')
        console.log(error)
        console.log('\n----------------------------\n')
    } )
}

/**
 * Obsreva el directorio
 */
if( options.file === '' && !options.generate && options.watch )
{
    directoryWatcher(dir)
}