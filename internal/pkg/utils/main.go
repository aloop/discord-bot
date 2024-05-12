package utils

func Singularize(word string) string {
	switch word {
	case "hours":
		return "hour"
	case "days":
		return "day"
	case "months":
		return "month"
	default:
		return word
	}
}
