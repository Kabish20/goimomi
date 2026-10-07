import re

with open('app/services/flight_service.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace all remaining travel_date HH:MM patterns with display_date
old_count = content.count('{travel_date}')
content = content.replace('f"{travel_date} 07:10"', 'f"{display_date} 07:10"')
content = content.replace('f"{travel_date} 12:40"', 'f"{display_date} 12:40"')
content = content.replace('f"{travel_date} 09:45"', 'f"{display_date} 09:45"')
content = content.replace('f"{travel_date} 15:20"', 'f"{display_date} 15:20"')
content = content.replace('f"{travel_date} 08:30"', 'f"{display_date} 08:30"')
content = content.replace('f"{travel_date} 13:10"', 'f"{display_date} 13:10"')
content = content.replace('f"{travel_date} 04:15"', 'f"{display_date} 04:15"')
content = content.replace('f"{travel_date} 11:30"', 'f"{display_date} 11:30"')
content = content.replace('f"{travel_date} 14:15"', 'f"{display_date} 14:15"')
content = content.replace('f"{travel_date} 19:30"', 'f"{display_date} 19:30"')
content = content.replace('f"{travel_date} 21:45"', 'f"{display_date} 21:45"')
content = content.replace('f"{travel_date} 05:10"', 'f"{display_date} 05:10"')
content = content.replace('f"{travel_date} 14:30"', 'f"{display_date} 14:30"')
content = content.replace('f"{travel_date} 17:15"', 'f"{display_date} 17:15"')
content = content.replace('f"{travel_date} 09:45"', 'f"{display_date} 09:45"')
content = content.replace('f"{travel_date} 12:35"', 'f"{display_date} 12:35"')
content = content.replace('f"{travel_date} 20:00"', 'f"{display_date} 20:00"')
content = content.replace('f"{travel_date} 22:50"', 'f"{display_date} 22:50"')
content = content.replace('f"{travel_date} 07:05"', 'f"{display_date} 07:05"')
content = content.replace('f"{travel_date} {dep_t}"', 'f"{display_date} {dep_t}"')
content = content.replace('f"{travel_date} {arr_t}"', 'f"{display_date} {arr_t}"')

with open('app/services/flight_service.py', 'w', encoding='utf-8') as f:
    f.write(content)

# Count remaining
remaining = content.count('{travel_date}')
display_count = content.count('{display_date}')
print(f"Remaining travel_date references: {remaining}")
print(f"display_date references: {display_count}")
print("Done!")
