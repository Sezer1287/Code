import hashlib

import sqlite3

from database import connection, cursor


def hash_password(password):
    
    password_bytes = password.encode("utf-8")
    password_hash = hashlib.sha256(password_bytes).hexdigest()

    return password_hash


def verify_password(password, stored_hash):
    
    entered_hash = hash_password(password)
    
    return entered_hash == stored_hash


def register_user(username, password):
    
    password_hash = hash_password(password)
    
    try:
        cursor.execute(
            "INSERT INTO users (username, password_hash) VALUES (?, ?)",
            (username, password_hash),
        )
    except sqlite3.IntegrityError:        
        connection.rollback()
        return None
    except sqlite3.Error:        
        connection.rollback()
        return None

    connection.commit()
    
    return cursor.lastrowid


def login_user(username, password):
    
    cursor.execute(
        "SELECT id, password_hash FROM users WHERE username = ?",
        (username,),
    )
    row = cursor.fetchone()

    if row is None:
        return None
    
    user_id, stored_hash = row
    
    if verify_password(password, stored_hash):
        return user_id
    
    return None


def get_user_by_username(username):
    
    cursor.execute(
        "SELECT id, username, created_at FROM users WHERE username = ?",
        (username,),
    )
    return cursor.fetchone()