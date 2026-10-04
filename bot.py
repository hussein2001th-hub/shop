import urllib.request
import urllib.parse
import json
import time

TOKEN = "8805342076:AAEoDsCLbJQagMANBVJxrShCjyUV5KGO5hI"
BASE_URL = f"https://api.telegram.org/bot{TOKEN}/"

# In-memory "database" to mimic the app
customers = {
    "1": {"name": "أحمد علي", "balance": 15000},
    "2": {"name": "محمد حسن", "balance": 0},
    "3": {"name": "سالم عبدالله", "balance": 45000}
}

def send_message(chat_id, text, reply_markup=None):
    url = BASE_URL + "sendMessage"
    data = {"chat_id": chat_id, "text": text, "parse_mode": "HTML"}
    if reply_markup:
         data["reply_markup"] = json.dumps(reply_markup)
    
    req = urllib.request.Request(url, data=json.dumps(data).encode('utf-8'), headers={'Content-Type': 'application/json'})
    urllib.request.urlopen(req)

def get_main_menu():
    return {
        "inline_keyboard": [
            [{"text": "👥 عرض الزبائن", "callback_data": "list_customers"}],
            [{"text": "➕ إضافة زبون جديد", "callback_data": "add_customer"}],
            [{"text": "📊 إجمالي الديون", "callback_data": "total_debts"}]
        ]
    }

def get_customer_menu(customer_id):
    return {
        "inline_keyboard": [
            [{"text": "➕ إضافة دين (له)", "callback_data": f"add_debt_{customer_id}"}, 
             {"text": "➖ تسديد دفعة (عليه)", "callback_data": f"pay_debt_{customer_id}"}],
            [{"text": "💬 إرسال مطالبة", "callback_data": f"remind_{customer_id}"}],
            [{"text": "🔙 رجوع", "callback_data": "main_menu"}]
        ]
    }

def handle_message(message):
    chat_id = message['chat']['id']
    text = message.get('text', '')
    
    if text == '/start':
        welcome_text = "<b>👋 أهلاً بك في نظام إدارة الديون (نسخة التلغرام المصغرة)</b>\n\nاختر من القائمة أدناه:"
        send_message(chat_id, welcome_text, get_main_menu())
    else:
        send_message(chat_id, "استخدم القائمة أو اكتب /start للبدء.")

def handle_callback(callback_query):
    chat_id = callback_query['message']['chat']['id']
    data = callback_query['data']
    message_id = callback_query['message']['message_id']
    
    # Acknowledge callback (optional but good practice)
    urllib.request.urlopen(BASE_URL + f"answerCallbackQuery?callback_query_id={callback_query['id']}")
    
    if data == "main_menu":
        send_message(chat_id, "<b>القائمة الرئيسية:</b>", get_main_menu())
    elif data == "list_customers":
        text = "<b>👥 قائمة الزبائن:</b>\n\n"
        for cid, info in customers.items():
            status = "🔴 عليه" if info['balance'] > 0 else "🟢 خالص"
            text += f"- {info['name']}: {info['balance']} دينار ({status})\n"
            text += f"   /user_{cid}\n"
        send_message(chat_id, text)
    elif data == "total_debts":
        total = sum([c['balance'] for c in customers.values()])
        send_message(chat_id, f"<b>📊 إجمالي الديون في السوق:</b>\n\n💰 {total} دينار", get_main_menu())
    elif data.startswith("user_"): # Can be triggered by command /user_1 as well, but let's handle buttons
        pass
    else:
        send_message(chat_id, f"تم الضغط على: {data}. هذه الميزة قيد التطوير.", get_main_menu())

def main():
    print("Bot is polling... Press Ctrl+C to stop.")
    offset = None
    while True:
        try:
            url = BASE_URL + "getUpdates?timeout=100"
            if offset:
                url += f"&offset={offset}"
            
            response = urllib.request.urlopen(url)
            updates = json.loads(response.read())['result']
            
            for update in updates:
                offset = update['update_id'] + 1
                
                if 'message' in update:
                    handle_message(update['message'])
                elif 'callback_query' in update:
                    handle_callback(update['callback_query'])
                    
        except Exception as e:
            print(f"Error: {e}")
            time.sleep(2)

if __name__ == '__main__':
    main()
