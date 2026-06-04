import sys
sys.path.append("scratch")
from parse_rcb_pdf import parse_line, class_patterns

line = '13 RCB PP1 B'
res = parse_line(line)
print("Result for '13 RCB PP1 B':", res)
