def prompt_int(message):
    
    try:
        return int(input(message).strip())
    except ValueError:
        return None


def prompt_float(message):
    
    try:
        return float(input(message).strip())
    except ValueError:
        return None