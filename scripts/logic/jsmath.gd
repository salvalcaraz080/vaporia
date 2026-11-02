extends RefCounted

## JavaScript Math.round: halfway cases go toward +infinity.
static func js_round(x: float) -> int:
	return int(floor(x + 0.5))


static func fmt_n(v: float) -> String:
	var n: int = js_round(v * 100.0)
	var neg: bool = n < 0
	n = absi(n)
	var whole: int = n / 100
	var frac: int = n % 100
	var body := str(whole)
	if frac == 0:
		body = str(whole)
	elif frac % 10 == 0:
		body = "%d.%d" % [whole, frac / 10]
	else:
		body = "%d.%02d" % [whole, frac]
	return "-" + body if neg else body


static func fmt_p(v: float) -> String:
	return fmt_n(float(js_round(v * 1000.0)) / 10.0) + "%"


static func to_fixed(x: float, digits: int) -> float:
	var p := pow(10.0, digits)
	return float(js_round(x * p)) / p
