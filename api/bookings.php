<?php
// api/bookings.php (обновлённая версия — сохраняет price_per_hour)
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Accept');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }
header('Content-Type: application/json; charset=utf-8');

$DATA_DIR = __DIR__ . '/../data';
$FILE = $DATA_DIR . '/bookings.json';
if (!is_dir($DATA_DIR)) mkdir($DATA_DIR, 0755, true);
if (!file_exists($FILE)) file_put_contents($FILE, json_encode(['bookings'=>[]], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE), LOCK_EX);

function read_data($file) {
    $s = @file_get_contents($file);
    if ($s === false || $s === '') return ['bookings'=>[]];
    $j = json_decode($s, true);
    if (!is_array($j) || !isset($j['bookings'])) return ['bookings'=>[]];
    return $j;
}
function write_data($file, $data) {
    $json = json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    $tmp = $file . '.tmp';
    file_put_contents($tmp, $json, LOCK_EX);
    rename($tmp, $file);
}
function respond($data, $code = 200) {
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    exit;
}
function normalize_booking($b){
    $out = [];
    $out['id'] = isset($b['id']) ? (string)$b['id'] : null;
    $out['date'] = isset($b['date']) ? (string)$b['date'] : '';
    $out['computer'] = isset($b['computer']) ? (string)$b['computer'] : '';
    $out['time'] = isset($b['time']) ? (string)$b['time'] : '';
    $out['user_login'] = isset($b['user_login']) ? (string)$b['user_login'] : (isset($b['user']) ? (string)$b['user'] : '');
    $out['user_email'] = isset($b['user_email']) ? (string)$b['user_email'] : '';
    $out['user_id'] = isset($b['user_id']) ? (string)$b['user_id'] : '';
    $out['created_at'] = isset($b['created_at']) ? (string)$b['created_at'] : null;
    $out['price_per_hour'] = isset($b['price_per_hour']) ? $b['price_per_hour'] : null;
    $out['total'] = isset($b['total']) ? $b['total'] : null;
    return $out;
}

$method = $_SERVER['REQUEST_METHOD'];
parse_str($_SERVER['QUERY_STRING'] ?? '', $qs);

// GET -> return all bookings
if ($method === 'GET') {
    $j = read_data($FILE);
    respond($j);
}

// POST: add bookings (supports action:add with bookings array)
if ($method === 'POST') {
    $raw = file_get_contents('php://input');
    $input = json_decode($raw, true);
    if (!is_array($input)) respond(['success'=>false,'error'=>'invalid_json'], 400);

    $data = read_data($FILE);
    $added = [];
    $skipped = [];

    if (isset($input['action']) && $input['action'] === 'add' && isset($input['bookings']) && is_array($input['bookings'])) {
        foreach ($input['bookings'] as $b) {
            $nb = normalize_booking($b);
            if (!$nb['id']) $nb['id'] = 'b_'.time().'_'.bin2hex(random_bytes(4));
            if (!$nb['created_at']) $nb['created_at'] = gmdate('c');

            // check duplicates
            $is_dup = false;
            foreach ($data['bookings'] as $exist){
                if (isset($exist['date']) && isset($exist['computer']) && isset($exist['time'])) {
                    if ($exist['date'] === $nb['date'] && (string)$exist['computer'] === (string)$nb['computer'] && $exist['time'] === $nb['time']) {
                        $is_dup = true;
                        $skipped[] = ['existing_id'=> $exist['id'] ?? null, 'date'=>$exist['date'], 'computer'=>$exist['computer'], 'time'=>$exist['time']];
                        break;
                    }
                }
            }
            if ($is_dup) continue;

            // compute total if not provided and price_per_hour provided (time in format HH:MM-HH:MM)
            if ($nb['total'] === null && $nb['price_per_hour'] !== null && $nb['time']){
                $parts = explode('-', $nb['time']);
                if(count($parts)===2){
                    list($s,$e) = $parts;
                    $sh = intval(substr($s,0,2)); $sm = intval(substr($s,3,2));
                    $eh = intval(substr($e,0,2)); $em = intval(substr($e,3,2));
                    $minutes = ($eh*60+$em) - ($sh*60+$sm);
                    if($minutes>0){
                        $hours = $minutes / 60.0;
                        $nb['total'] = $hours * floatval($nb['price_per_hour']);
                    }
                }
            }

            $data['bookings'][] = $nb;
            $added[] = $nb['id'];
        }
        if (count($added) > 0) write_data($FILE, $data);
        respond(['success'=>true,'added'=>$added,'skipped'=>$skipped]);
    }

    // single booking fallback
    if (isset($input['date']) && isset($input['computer']) && isset($input['time'])) {
        $nb = normalize_booking($input);
        if (!$nb['id']) $nb['id'] = 'b_'.time().'_'.bin2hex(random_bytes(4));
        if (!$nb['created_at']) $nb['created_at'] = gmdate('c');
        foreach ($data['bookings'] as $exist){
            if ($exist['date'] === $nb['date'] && (string)$exist['computer'] === (string)$nb['computer'] && $exist['time'] === $nb['time']) {
                respond(['success'=>false,'error'=>'duplicate','existing_id'=>$exist['id'] ?? null], 409);
            }
        }
        $data['bookings'][] = $nb;
        write_data($FILE, $data);
        respond(['success'=>true,'id'=>$nb['id']]);
    }

    respond(['success'=>false,'error'=>'invalid_input'], 400);
}

// DELETE -> delete by id
if ($method === 'DELETE') {
    $id = $qs['id'] ?? null;
    if (!$id) respond(['success'=>false,'error'=>'no_id'], 400);
    $data = read_data($FILE);
    $found = false;
    foreach ($data['bookings'] as $k => $v) {
        if (isset($v['id']) && (string)$v['id'] === (string)$id) {
            array_splice($data['bookings'], $k, 1);
            $found = true;
            break;
        }
    }
    if ($found) {
        write_data($FILE, $data);
        respond(['success'=>true]);
    } else {
        respond(['success'=>false,'error'=>'not_found'], 404);
    }
}

respond(['success'=>false,'error'=>'method_not_allowed'], 405);
exit;
?>
