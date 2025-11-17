<?php
// api/users.php  (обновлённая версия: поддержка role)
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }
header('Content-Type: application/json');

$DATA_DIR = __DIR__ . '/../data';
$FILE = $DATA_DIR . '/users.json';
if(!is_dir($DATA_DIR)) mkdir($DATA_DIR, 0755, true);
if(!file_exists($FILE)) file_put_contents($FILE, json_encode(['users'=>[]], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE), LOCK_EX);

function read_data($file) {
    $s = @file_get_contents($file);
    if($s === false || $s === '') return ['users'=>[]];
    $j = json_decode($s, true);
    if(!is_array($j) || !isset($j['users'])) return ['users'=>[]];
    return $j;
}
function write_data($file, $data) {
    $json = json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    $tmp = $file . '.tmp';
    file_put_contents($tmp, $json, LOCK_EX);
    rename($tmp, $file);
}

$method = $_SERVER['REQUEST_METHOD'];
$input = json_decode(file_get_contents('php://input'), true);

function normalize_user($u){
    return [
        'id' => isset($u['id']) ? (string)$u['id'] : null,
        'email' => isset($u['email']) ? (string)$u['email'] : '',
        'login' => isset($u['login']) ? (string)$u['login'] : '',
        'password' => isset($u['password']) ? (string)$u['password'] : '',
        // NEW: role (worker|user)
        'role' => isset($u['role']) ? (string)$u['role'] : 'user'
    ];
}

if($method === 'GET'){
    $j = read_data($FILE);
    echo json_encode($j, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    exit;
}

if($method === 'POST'){
    if(!is_array($input)){
        http_response_code(400);
        echo json_encode(['success'=>false,'error'=>'invalid_json']);
        exit;
    }
    $j = read_data($FILE);
    // action add with single user or array
    if(isset($input['action']) && $input['action'] === 'add' && isset($input['user']) && is_array($input['user'])){
        $u = $input['user'];
        if(!isset($u['id'])) $u['id'] = 'u_'.time().'_'.bin2hex(random_bytes(4));
        if(!isset($u['email'])) $u['email'] = '';
        if(!isset($u['login'])) $u['login'] = '';
        if(!isset($u['password'])) $u['password'] = '';
        // default role 'user' (unless provided)
        $u['role'] = isset($u['role']) ? (string)$u['role'] : 'user';

        foreach($j['users'] as $ex){
            if(strtolower($ex['email']) === strtolower($u['email']) || strtolower($ex['login']) === strtolower($u['login'])){
                echo json_encode(['success'=>false,'error'=>'exists']);
                exit;
            }
        }
        $j['users'][] = normalize_user($u);
        write_data($FILE, $j);
        echo json_encode(['success'=>true]);
        exit;
    }
    // fallback: direct posting of user object
    if(isset($input['email']) && isset($input['login']) && isset($input['password'])){
        $u = $input;
        if(!isset($u['id'])) $u['id'] = 'u_'.time().'_'.bin2hex(random_bytes(4));
        $u['role'] = isset($u['role']) ? (string)$u['role'] : 'user';
        foreach($j['users'] as $ex){
            if(strtolower($ex['email']) === strtolower($u['email']) || strtolower($ex['login']) === strtolower($u['login'])){
                echo json_encode(['success'=>false,'error'=>'exists']);
                exit;
            }
        }
        $j['users'][] = normalize_user($u);
        write_data($FILE, $j);
        echo json_encode(['success'=>true,'id'=>$u['id']]);
        exit;
    }

    echo json_encode(['success'=>false,'error'=>'invalid_input']);
    exit;
}

http_response_code(405);
echo json_encode(['success'=>false,'error'=>'method_not_allowed']);
exit;
?>
