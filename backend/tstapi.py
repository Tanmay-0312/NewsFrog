import google.generativeai as gen

gen.configure(api_key="AIzaSyBGzqvNzTwRVypdcu9OPq5wq6PM-RMoo5Y")

model = gen.GenerativeModel("gemini-1.5-flash")

response = model.generate_content("Summarize: India won today.")

print(response.text)
