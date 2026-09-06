import re
from typing import Tuple

# Multilingual keyword mapping for Hindi, Gujarati, Hinglish and mixed terms
DOMAIN_TRANSLATIONS = {
    # Hindi / Hinglish / Gujarati to English
    "choot": "discount percentage ceiling",
    "chhut": "discount",
    "discount": "discount",
    "bhav": "price quotation cost",
    "kimat": "price quotation",
    "daam": "price cost",
    "bhavpatra": "quotation proposal",
    "manzoori": "approval authorization",
    "swikriti": "approval confirmed",
    "khatra": "risk blended_risk",
    "nuksan": "margin loss risk",
    "godown": "warehouse stock inventory",
    "godam": "warehouse stock inventory",
    "kothar": "warehouse inventory",
    "mal": "products inventory stock goods",
    "saman": "products goods",
    "bill": "billing invoice payment",
    "chalan": "invoice delivery dispatch",
    "paise": "payment billing invoice",
    "graahak": "customer portal client",
    "grahak": "customer portal",
    "adheekar": "role permission rbac",
    "hakk": "permission role",
    "shikayat": "dispute negotiation issue",
    "prakriya": "process workflow lifecycle hierarchy",
    "niyam": "rules policy governance configuration",
    "su": "what",
    "shun": "what",
    "kem": "how why",
    "kya": "what",
    "kaise": "how",
    "kitna": "how much quantity price count",
    "kitne": "how many count total",
    "kitni": "how much quantity count",
    "bane": "created generated active",
    "bana": "create create",
    "che": "is",
    "hai": "is",
    "hain": "are",
    "nathi": "not",
    "nahi": "not",
    "aapo": "give show",
    "batao": "tell explain show",
    "samjhao": "explain overview",
    "madad": "help assistance"
}

def detect_language(text: str) -> str:
    """
    Detects language code: 'hi' (Devanagari Hindi), 'gu' (Gujarati script),
    'hinglish' (Romanized Hindi/Gujarati/mixed), or 'en' (English).
    """
    # Check Devanagari Unicode block
    if re.search(r"[\u0900-\u097F]", text):
        return "hi"
    
    # Check Gujarati Unicode block
    if re.search(r"[\u0A80-\u0AFF]", text):
        return "gu"

    # Check for Romanized Hindi / Gujarati / Hinglish markers
    lower_text = text.lower()
    words = re.findall(r"\b\w+\b", lower_text)
    hinglish_markers = {
        "kya", "kaise", "hai", "hain", "karo", "karun", "batao", "samjhao", "choot",
        "bhav", "daam", "kimat", "godown", "godam", "graahak", "grahak", "manzoori",
        "nuksan", "khatra", "paise", "che", "chhe", "su", "shun", "nathi", "aapo",
        "kem", "tame", "hu", "aavi", "mate", "chalan", "mal", "kitna", "kitne", "kitni", "bane", "bana"
    }
    
    hinglish_count = sum(1 for w in words if w in hinglish_markers)
    if hinglish_count >= 1:
        # If words include Gujarati romanized words like 'che', 'su', 'tame', 'mate'
        if any(w in ["che", "chhe", "su", "shun", "tame", "aapo", "kem", "mate"] for w in words):
            return "gu_latn"  # Romanized Gujarati / Hinglish-Gujarati
        return "hinglish"

    return "en"

def expand_query_for_retrieval(query: str) -> Tuple[str, str]:
    """
    Identifies language and augments non-English queries with English domain concepts
    so the English knowledge base retrieval achieves optimal relevance.
    Returns: (expanded_english_query, detected_language)
    """
    lang = detect_language(query)
    lower_query = query.lower()
    
    expanded_terms = []
    
    # Check words against translation map
    tokens = re.findall(r"\b\w+\b", lower_query)
    for token in tokens:
        if token in DOMAIN_TRANSLATIONS:
            expanded_terms.append(DOMAIN_TRANSLATIONS[token])

    # Devanagari common terms
    if lang == "hi":
        if "छूट" in query or "डिस्काउंट" in query:
            expanded_terms.append("discount ceiling threshold")
        if "मंजूरी" in query or "अनुमोदन" in query:
            expanded_terms.append("approval workflow tier")
        if "भाव" in query or "कीमत" in query or "दाम" in query:
            expanded_terms.append("price quotation cpq")
        if "गोदाम" in query or "माल" in query:
            expanded_terms.append("warehouse stock inventory fulfillment")
        if "बिल" in query or "भुगतान" in query:
            expanded_terms.append("billing invoice payment")
        if "ग्राहक" in query:
            expanded_terms.append("customer portal")
        if "जोखिम" in query or "नुकसान" in query:
            expanded_terms.append("blended risk deal health margin")
        if "भूमिका" in query or "अधिकार" in query:
            expanded_terms.append("roles permissions rbac sales_rep sales_manager")

    # Gujarati common terms
    if lang == "gu":
        if "છૂટ" in query or "ડિસ્કાઉન્ટ" in query:
            expanded_terms.append("discount ceiling tier")
        if "મંજૂરી" in query:
            expanded_terms.append("approval tiers workflow")
        if "ભાવ" in query or "કિંમત" in query:
            expanded_terms.append("price quotation cpq")
        if "ગોડાઉન" in query or "માલ" in query:
            expanded_terms.append("warehouse stock fulfillment split")
        if "બિલ" in query or "ચુકવણી" in query:
            expanded_terms.append("billing invoice payment")
        if "ગ્રાહક" in query:
            expanded_terms.append("customer portal")
        if "જોખમ" in query or "નુકસાન" in query:
            expanded_terms.append("blended risk margin deal health")
        if "ભૂમિકા" in query:
            expanded_terms.append("roles permissions rbac")

    if expanded_terms:
        expanded_query = f"{query} {' '.join(set(expanded_terms))}"
    else:
        expanded_query = query

    return expanded_query, lang
