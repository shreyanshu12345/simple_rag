import time

class spanTracing():
    all_logs = []
    def __init__(self, name):
        self.__cost = {"start_time": None, "end_time": None, "duration": None}
        self.name = name

    #def set_token(self, tokens):
        #self.__cost["tokens"] = tokens

    def __enter__(self):
        self.__cost["start_time"] = time.time()
        return self

    def log(self):
        print("****** logging ********")
        print("******* ", self.name, " ********")

        for i in self.__cost:
            if(self.__cost[i] is not None):
                print(i, " : ", self.__cost[i])
        spanTracing.all_logs.append(self.__cost)

    #def set_k(self, k):
       # self.__cost["k"] = k

    def set_metadata(self, key, value):
        self.__cost[key.lower()] = value

    def __exit__(self, *args):
        self.__cost["end_time"] = time.time()
        self.__cost["duration"] = self.__cost["end_time"] - self.__cost["start_time"]
        self.log()
        pass





if(__name__ == "__main__"):
    with spanTracing("retrival") as span:
        time.sleep(1)
        print("tracing....")
