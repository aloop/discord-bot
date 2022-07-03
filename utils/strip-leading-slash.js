export default function stripLeadingSlash(str) {
    return str.startsWith("/") ? str.substr(1) : str;
}
