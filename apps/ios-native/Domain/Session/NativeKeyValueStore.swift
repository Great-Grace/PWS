import Foundation
import Security

protocol NativeKeyValueStore {
    func string(forKey key: String) -> String?
    func setString(_ value: String, forKey key: String) throws
    func removeValue(forKey key: String) throws
}

final class InMemoryNativeKeyValueStore: NativeKeyValueStore {
    private var values: [String: String]

    init(initialValues: [String: String] = [:]) {
        values = initialValues
    }

    func string(forKey key: String) -> String? {
        values[key]
    }

    func setString(_ value: String, forKey key: String) throws {
        values[key] = value
    }

    func removeValue(forKey key: String) throws {
        values.removeValue(forKey: key)
    }
}

enum NativeKeyValueStoreError: Error, Equatable {
    case keychainSetFailed(OSStatus)
    case keychainRemoveFailed(OSStatus)
}

final class KeychainNativeKeyValueStore: NativeKeyValueStore {
    private let service: String
    private let accessGroup: String?

    init(
        service: String = Bundle.main.bundleIdentifier ?? "woos.owndo",
        accessGroup: String? = nil
    ) {
        self.service = service
        self.accessGroup = accessGroup
    }

    func string(forKey key: String) -> String? {
        var query = baseQuery(forKey: key)
        query[kSecReturnData as String] = true
        query[kSecMatchLimit as String] = kSecMatchLimitOne

        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)
        guard status == errSecSuccess, let data = result as? Data else { return nil }
        return String(data: data, encoding: .utf8)
    }

    func setString(_ value: String, forKey key: String) throws {
        let data = Data(value.utf8)
        let attributes: [String: Any] = [kSecValueData as String: data]

        let status = SecItemUpdate(baseQuery(forKey: key) as CFDictionary, attributes as CFDictionary)
        if status == errSecSuccess {
            return
        }
        guard status == errSecItemNotFound else {
            throw NativeKeyValueStoreError.keychainSetFailed(status)
        }

        var item = baseQuery(forKey: key)
        item[kSecValueData as String] = data
        item[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
        let addStatus = SecItemAdd(item as CFDictionary, nil)
        guard addStatus == errSecSuccess else {
            throw NativeKeyValueStoreError.keychainSetFailed(addStatus)
        }
    }

    func removeValue(forKey key: String) throws {
        let status = SecItemDelete(baseQuery(forKey: key) as CFDictionary)
        guard status == errSecSuccess || status == errSecItemNotFound else {
            throw NativeKeyValueStoreError.keychainRemoveFailed(status)
        }
    }

    private func baseQuery(forKey key: String) -> [String: Any] {
        var query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key
        ]
        if let accessGroup, !accessGroup.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            query[kSecAttrAccessGroup as String] = accessGroup
        }
        return query
    }
}
