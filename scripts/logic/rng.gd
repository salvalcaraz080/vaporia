extends RefCounted

## 32-bit hash + mulberry32, matching the v3 prototype (Math.imul / >>> / | 0).

var _a: int


func _init(seed: String = "") -> void:
	_a = hash_str(seed)


static func i32(x: int) -> int:
	x = x & 0xFFFFFFFF
	if x >= 0x80000000:
		x -= 0x100000000
	return x


static func imul(a: int, b: int) -> int:
	return i32(i32(a) * i32(b))


static func ushr(x: int, n: int) -> int:
	return (x & 0xFFFFFFFF) >> n


static func shl(x: int, n: int) -> int:
	return i32((x & 0xFFFFFFFF) << n)


static func hash_str(s: String) -> int:
	var h := i32(1779033703 ^ s.length())
	for i in s.length():
		h = imul(h ^ s.unicode_at(i), 3432918353)
		h = i32(shl(h, 13) | ushr(h, 19))
	h = imul(h ^ ushr(h, 16), 2246822507)
	h = imul(h ^ ushr(h, 13), 3266489909)
	h = i32(h ^ ushr(h, 16))
	return h & 0xFFFFFFFF


func nextf() -> float:
	_a = i32(_a)
	_a = i32(_a + 0x6d2b79f5)
	var t := imul(_a ^ ushr(_a, 15), 1 | _a)
	# JS uses float addition, then ToInt32 via the following XOR.
	t = i32(i32(t + imul(t ^ ushr(t, 7), 61 | t)) ^ t)
	return float(i32(t ^ ushr(t, 14)) & 0xFFFFFFFF) / 4294967296.0


func pick_index(n: int) -> int:
	return int(floor(nextf() * float(n)))
