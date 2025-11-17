<?php
// api/computers.php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Accept');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }
header('Content-Type: application/json; charset=utf-8');

$DATA_DIR = __DIR__ . '/../data';
$FILE = $DATA_DIR . '/computers.json';
$BOOKINGS_FILE = $DATA_DIR . '/bookings.json';

if (!is_dir($DATA_DIR)) mkdir($DATA_DIR, 0755, true);
if (!file_exists($FILE)) file_put_contents($FILE, json_encode(['computers'=>[]], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE), LOCK_EX);
if (!file_exists($BOOKINGS_FILE)) file_put_contents($BOOKINGS_FILE, json_encode(['bookings'=>[]], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE), LOCK_EX);

function read_json($file){
    $s = @file_get_contents($file);
    if ($s === false || $s === '') return [];
    $j = json_decode($s, true);
    return is_array($j) ? $j : [];
}
function write_json_atomic($file, $data){
    $json = json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    $tmp = $file . '.tmp';
    file_put_contents($tmp, $json, LOCK_EX);
    rename($tmp, $file);
}

$method = $_SERVER['REQUEST_METHOD'];
$input = json_decode(file_get_contents('php://input'), true);

// GET -> return computers
if ($method === 'GET'){
    $j = read_json($FILE);
    if(!isset($j['computers']) || !is_array($j['computers'])) $j['computers'] = [];
    echo json_encode(['computers'=>$j['computers']], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    exit;
}

// POST -> add or update
if ($method === 'POST'){
    if(!is_array($input)) { http_response_code(400); echo json_encode(['success'=>false,'error'=>'invalid_json']); exit; }
    $data = read_json($FILE);
    if(!isset($data['computers']) || !is_array($data['computers'])) $data['computers'] = [];

    // update existing
    if (isset($input['action']) && $input['action'] === 'update' && isset($input['id']) && isset($input['computer']) && is_array($input['computer'])){
        $id = (string)$input['id'];
        $found = false;
        for($i=0;$i<count($data['computers']);$i++){
            if(isset($data['computers'][$i]['id']) && (string)$data['computers'][$i]['id'] === $id){
                // allow these fields:
                $allowed = ['label','processor','gpu','ram','storage','monitor','price','image','notes','type','number'];
                foreach($allowed as $f){
                    if(array_key_exists($f, $input['computer'])) $data['computers'][$i][$f] = $input['computer'][$f];
                }
                $found = true;
                break;
            }
        }
        if(!$found){ http_response_code(404); echo json_encode(['success'=>false,'error'=>'not_found']); exit; }
        write_json_atomic($FILE, $data);
        echo json_encode(['success'=>true]); exit;
    }

    // add new computer
    if (isset($input['action']) && $input['action'] === 'add' && isset($input['computer']) && is_array($input['computer'])){
        $c = $input['computer'];
        if(!isset($c['id'])) $c['id'] = 'c_'.time().'_'.bin2hex(random_bytes(4));
        // set number = maxNumber+1 if not provided
        $max = 0; foreach($data['computers'] as $ex) if(isset($ex['number']) && is_numeric($ex['number']) && $ex['number']>$max) $max = $ex['number'];
        if(!isset($c['number'])) $c['number'] = $max+1;
        $data['computers'][] = $c;
        write_json_atomic($FILE, $data);
        echo json_encode(['success'=>true,'id'=>$c['id']]); exit;
    }

    echo json_encode(['success'=>false,'error'=>'invalid_input']); exit;
}

// DELETE -> delete by id and reorder numbers, update bookings
if ($method === 'DELETE'){
    parse_str($_SERVER['QUERY_STRING'] ?? '', $qs);
    $id = $qs['id'] ?? null;
    if(!$id){ http_response_code(400); echo json_encode(['success'=>false,'error'=>'no_id']); exit; }
    $data = read_json($FILE);
    if(!isset($data['computers']) || !is_array($data['computers'])) $data['computers'] = [];
    $found = false;
    $old_numbers = [];
    foreach($data['computers'] as $c){ if(isset($c['id'])) $old_numbers[$c['id']] = $c['number'] ?? null; }
    for($i=0;$i<count($data['computers']);$i++){
        if(isset($data['computers'][$i]['id']) && (string)$data['computers'][$i]['id'] === (string)$id){
            array_splice($data['computers'],$i,1);
            $found = true;
            break;
        }
    }
    if(!$found){ http_response_code(404); echo json_encode(['success'=>false,'error'=>'not_found']); exit; }
    // reassign numbers sequentially by sorting current array by previous 'number' or keep order as is
    usort($data['computers'], function($a,$b){
        $na = isset($a['number']) ? (int)$a['number'] : 0;
        $nb = isset($b['number']) ? (int)$b['number'] : 0;
        return $na - $nb;
    });
    // build mapping oldNumber -> newNumber based on id
    $mapping = [];
    $idx = 1;
    foreach($data['computers'] as $k => $c){
        $old = $old_numbers[$c['id']] ?? $c['number'] ?? null;
        $mapping[(string)$old] = $idx;
        $data['computers'][$k]['number'] = $idx;
        $idx++;
    }
    // update bookings: if booking.computer matches an old number, update to new number
    $bookdata = read_json($BOOKINGS_FILE);
    if(!isset($bookdata['bookings']) || !is_array($bookdata['bookings'])) $bookdata['bookings'] = [];
    $changed = false;
    foreach($bookdata['bookings'] as $bi => $b){
        $compVal = isset($b['computer']) ? (string)$b['computer'] : '';
        if(isset($mapping[$compVal])){
            $bookdata['bookings'][$bi]['computer'] = (string)$mapping[$compVal];
            $changed = true;
        } else {
            // if booking references removed computer number, leave as is or mark invalid — here we leave it
        }
    }
    // write files
    write_json_atomic($FILE, $data);
    if($changed) write_json_atomic($BOOKINGS_FILE, $bookdata);
    echo json_encode(['success'=>true]); exit;
}

http_response_code(405);
echo json_encode(['success'=>false,'error'=>'method_not_allowed']);
exit;
?>
