#!/usr/bin/env node

const path = require( "path" )
const fs = require( "fs" )
const mysql = require("mysql");

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
    config: 'sql_updater.config.json',     // archivo de configuracion
    file: '',       // sube un solo archivo
    all: false,     // sube todos los archivos del directorio
    watch: false,       // observa un solo archivo
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
    if( args.length !== 2 )
    {
        let i = 2;
        let l = args.length;
        for( i; i < l; i++ )
        {
            switch( args[i] )
            {
                case 'help':
                    console.log( help )
                    process.exit();
                    return;
                case 'all':
                    options.all = true;
                    break;
                case 'w':
                    options.watch = true;
                    break;
                default:
                    options.file = args[i];
                    break;
            }
        }
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



if( options.all )
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
else if( options.file )
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
else
{
    directoryWatcher(dir)
}

