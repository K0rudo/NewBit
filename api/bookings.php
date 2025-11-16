<?php
// api/bookings.php
// Минимальное API для разработческой работы с бронями.
// Создаёт/читает/удаляет записи в data/bookings.json.
//
// ВНИМАНИЕ: это пример для разработки. Не использовать в продакшене без доработки (аутентификация, валидация, безопасность).

// Простая политика CORS для локальной разработки (убери/сужай в проде при необходимости)
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

header('Content-Type: application/json');

// Путь к каталогу данных и файлу
$DATA_DIR = __DIR__ . '/../data';
$FILE = $DATA_DIR . '/bookings.json';

// Создаём директорию и файл при необходимости
if (!is_dir($DATA_DIR)) {
    mkdir($DATA_DIR, 0755, true);
}
if (!file_exists($FILE)) {
    file_put_contents($FILE, json_encode(['bookings' => []], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE), LOCK_EX);
}

// Утилиты чтения/записи с блокировкой
function read_data($file) {
    $content = @file_get_contents($file);
    if ($content === false || $content === '') {
        return ['bookings' => []];
    }
    $j = json_decode($content, true);
    if (!is_array($j)) return ['bookings' => []];
    if (!isset($j['bookings']) || !is_array($j['bookings'])) $j['bookings'] = [];
    return $j;
}

function write_data($file, $data) {
    $json = json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    // atomic write
    $tmp = $file . '.tmp';
    file_put_contents($tmp, $json, LOCK_EX);
    rename($tmp, $file);
}

// Получаем метод и парсим query string
$method = $_SERVER['REQUEST_METHOD'];
parse_str($_SERVER['QUERY_STRING'] ?? '', $qs);

// GET — вернуть всё
if ($method === 'GET') {
    $j = read_data($FILE);
    echo json_encode($j, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    exit;
}

// POST — добавить брони
if ($method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    if (!is_array($input)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'invalid_json']);
        exit;
    }

    $j = read_data($FILE);

    // Поддерживаем payload { action: "add", bookings: [ ... ] }
    if (isset($input['action']) && $input['action'] === 'add' && isset($input['bookings']) && is_array($input['bookings'])) {
        foreach ($input['bookings'] as $b) {
            // Базовая валидация/присвоение id
            if (!isset($b['id'])) $b['id'] = 'b_' . time() . '_' . bin2hex(random_bytes(4));
            if (!isset($b['date'])) $b['date'] = '';
            if (!isset($b['computer'])) $b['computer'] = '';
            if (!isset($b['time'])) $b['time'] = '';
            if (!isset($b['user'])) $b['user'] = '';
            $j['bookings'][] = $b;
        }
        write_data($FILE, $j);
        echo json_encode(['success' => true]);
        exit;
    }

    // Или если прислали один объект брони — добавим его
    if (isset($input['date']) && isset($input['computer']) && isset($input['time'])) {
        $b = $input;
        if (!isset($b['id'])) $b['id'] = 'b_' . time() . '_' . bin2hex(random_bytes(4));
        $j['bookings'][] = $b;
        write_data($FILE, $j);
        echo json_encode(['success' => true, 'id' => $b['id']]);
        exit;
    }

    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'invalid_input']);
    exit;
}

// DELETE — удалить бронь по id, ожидается ?id=...
if ($method === 'DELETE') {
    $id = $qs['id'] ?? null;
    if (!$id) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'no_id']);
        exit;
    }
    $j = read_data($FILE);
    $found = false;
    foreach ($j['bookings'] as $k => $v) {
        if (isset($v['id']) && (string)$v['id'] === (string)$id) {
            array_splice($j['bookings'], $k, 1);
            $found = true;
            break;
        }
    }
    if ($found) {
        write_data($FILE, $j);
        echo json_encode(['success' => true]);
        exit;
    } else {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'not_found']);
        exit;
    }
}

// Метод не поддерживается
http_response_code(405);
echo json_encode(['success' => false, 'error' => 'method_not_allowed']);
exit;
?>
